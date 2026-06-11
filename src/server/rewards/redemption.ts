import { randomBytes } from "node:crypto";
import {
  Prisma,
  type Reward,
  type RewardRedemption,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  spendTokens,
  refundTokens,
  InsufficientTokensError,
} from "@/server/tokens/ledger";

/**
 * Сервис «Маркетплейс наград» (Этап 5).
 *
 * Единая точка покупки/резерва/отмены/решения по наградам. ВСЕ мутации
 * баланса проходят через ledger (`spendTokens` / `refundTokens`) — здесь нет
 * собственной арифметики кошелька. Гарантии:
 *   - баланс не уходит в минус (списание бросает InsufficientTokensError);
 *   - возврат идемпотентен (нельзя вернуть токены дважды — проверяем статус
 *     заявки и ключ ledger `redeem:{redemptionId}`);
 *   - сток уменьшается атомарно в `$transaction` под условием `stock > 0`.
 *
 * refType токеновых операций — `reward`; refId — id награды (для аналитики),
 * idempotencyKey списания — `redeem:{redemptionId}` (один редемпшн = одно
 * списание), возврата — `refund:{redemptionId}` (один редемпшн = один возврат).
 */

// ─────────────────────────── Ошибки домена ───────────────────────────

/** Доменная ошибка маркетплейса с машинным кодом для HTTP-ответа. */
export class RedemptionError extends Error {
  readonly code:
    | "NOT_FOUND" // награда/заявка не найдена
    | "INACTIVE" // награда неактивна
    | "EXPIRED" // срок действия награды истёк
    | "OUT_OF_STOCK" // нет в наличии
    | "REQUIRES_APPROVAL" // нужна заявка (reserve), а вызван redeem
    | "NOT_APPROVABLE" // награда не требует одобрения, а вызван reserve
    | "WRONG_STATUS" // нельзя выполнить из текущего статуса заявки
    | "FORBIDDEN"; // заявка чужая / нет прав

  constructor(code: RedemptionError["code"], message: string) {
    super(message);
    this.name = "RedemptionError";
    this.code = code;
  }
}

// Реэкспорт для удобства роутов (ловят оба типа из одного модуля).
export { InsufficientTokensError };

// ─────────────────────────── Внутренние хелперы ───────────────────────────

/** Транзакционный клиент Prisma. */
type Tx = Prisma.TransactionClient;

/** Генерирует код выдачи вида `EVZ-XXXXXX` (6 символов A–Z/2–9). */
function generateRedemptionCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // без похожих 0/O/1/I
  const bytes = randomBytes(6);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += alphabet[bytes[i] % alphabet.length];
  }
  return `EVZ-${code}`;
}

/**
 * Загружает награду и валидирует доступность к покупке/резерву.
 * Проверки: существует, активна, не истёк срок, (если задан сток) сток > 0.
 * НЕ проверяет requiresApproval — это решает вызывающая операция.
 */
async function loadPurchasableReward(tx: Tx, rewardId: string): Promise<Reward> {
  const reward = await tx.reward.findUnique({ where: { id: rewardId } });
  if (!reward) {
    throw new RedemptionError("NOT_FOUND", "Награда не найдена");
  }
  if (!reward.isActive) {
    throw new RedemptionError("INACTIVE", "Награда недоступна");
  }
  if (reward.expiresAt && reward.expiresAt.getTime() < Date.now()) {
    throw new RedemptionError("EXPIRED", "Срок действия награды истёк");
  }
  if (reward.stock != null && reward.stock <= 0) {
    throw new RedemptionError("OUT_OF_STOCK", "Награды нет в наличии");
  }
  return reward;
}

/** Атомарно списывает 1 единицу стока, если он задан и > 0. */
async function decrementStock(tx: Tx, reward: Reward): Promise<void> {
  if (reward.stock == null) return; // безлимит
  const res = await tx.reward.updateMany({
    where: { id: reward.id, stock: { gt: 0 } },
    data: { stock: { decrement: 1 } },
  });
  if (res.count === 0) {
    // Гонка: сток разобрали параллельно между чтением и списанием.
    throw new RedemptionError("OUT_OF_STOCK", "Награды нет в наличии");
  }
}

/** Возвращает 1 единицу стока (при отмене/отклонении), если сток задан. */
async function restoreStock(tx: Tx, reward: { id: string; stock: number | null }): Promise<void> {
  if (reward.stock == null) return;
  await tx.reward.update({
    where: { id: reward.id },
    data: { stock: { increment: 1 } },
  });
}

// ─────────────────────────── Результаты ───────────────────────────

export interface RedeemResult {
  redemption: RewardRedemption;
  balance: number;
}

// ─────────────────────────── Покупка (без одобрения) ───────────────────────────

export interface RedeemParams {
  userId: string;
  rewardId: string;
}

/**
 * Мгновенная покупка награды (`!requiresApproval`).
 *
 * В одной транзакции: валидируем награду → списываем токены через ledger →
 * уменьшаем сток → создаём RewardRedemption(ISSUED, code, issuedAt). Лента +
 * уведомление — после транзакции. При нехватке токенов пробрасывает
 * InsufficientTokensError (баланс при этом НЕ меняется).
 */
export async function redeemReward(params: RedeemParams): Promise<RedeemResult> {
  const { userId, rewardId } = params;

  const { redemption, balance, reward } = await prisma.$transaction(async (tx) => {
    const reward = await loadPurchasableReward(tx, rewardId);

    if (reward.requiresApproval) {
      throw new RedemptionError(
        "REQUIRES_APPROVAL",
        "Эта награда выдаётся по заявке — оформите резерв",
      );
    }

    // 1. Создаём редемпшн заранее, чтобы получить id для idempotencyKey.
    const created = await tx.rewardRedemption.create({
      data: {
        userId,
        rewardId,
        costTokens: reward.costTokens,
        status: "ISSUED",
        code: generateRedemptionCode(),
        issuedAt: new Date(),
      },
    });

    // 2. Списание токенов через ledger (бросит InsufficientTokensError → откат).
    const spend = await spendTokens({
      userId,
      amount: reward.costTokens,
      reason: `Покупка награды «${reward.title}»`,
      refType: "reward",
      refId: reward.id,
      idempotencyKey: `redeem:${created.id}`,
    });

    // 3. Уменьшаем сток (если задан).
    await decrementStock(tx, reward);

    return { redemption: created, balance: spend.balance, reward };
  });

  // 4. Лента активности + уведомление (вне транзакции).
  await prisma.activityFeedItem.create({
    data: {
      userId,
      type: "REWARD_BUY",
      refType: "reward",
      refId: reward.id,
      text: `Покупка: «${reward.title}» −${reward.costTokens} токенов`,
      visibility: "PUBLIC",
    },
  });
  await prisma.notification.create({
    data: {
      userId,
      type: "REWARD_PURCHASE",
      title: "Покупка оформлена",
      body: `«${reward.title}» — код выдачи ${redemption.code}. Списано ${reward.costTokens} токенов.`,
      refType: "redemption",
      refId: redemption.id,
    },
  });

  return { redemption, balance };
}

// ─────────────────────────── Резерв (с одобрением) ───────────────────────────

/**
 * Резерв награды под одобрение (`requiresApproval`, крупные TRIP/EVENT_ACCESS).
 *
 * Токены списываются сразу (hold), сток резервируется (−1), создаётся
 * RewardRedemption(PENDING_APPROVAL) без кода. Выдача кода — на этапе approve.
 * Если заявку отклонят/отменят — токены и сток вернутся.
 */
export async function reserveReward(params: RedeemParams): Promise<RedeemResult> {
  const { userId, rewardId } = params;

  const { redemption, balance, reward } = await prisma.$transaction(async (tx) => {
    const reward = await loadPurchasableReward(tx, rewardId);

    if (!reward.requiresApproval) {
      throw new RedemptionError(
        "NOT_APPROVABLE",
        "Эта награда покупается сразу, резерв не требуется",
      );
    }

    const created = await tx.rewardRedemption.create({
      data: {
        userId,
        rewardId,
        costTokens: reward.costTokens,
        status: "PENDING_APPROVAL",
      },
    });

    const spend = await spendTokens({
      userId,
      amount: reward.costTokens,
      reason: `Резерв награды «${reward.title}» (заявка)`,
      refType: "reward",
      refId: reward.id,
      idempotencyKey: `redeem:${created.id}`,
    });

    await decrementStock(tx, reward);

    return { redemption: created, balance: spend.balance, reward };
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "REDEMPTION_STATUS",
      title: "Заявка на награду создана",
      body: `«${reward.title}» — заявка отправлена на одобрение. Списано (резерв) ${reward.costTokens} токенов.`,
      refType: "redemption",
      refId: redemption.id,
    },
  });

  return { redemption, balance };
}

// ─────────────────────────── Отмена пользователем ───────────────────────────

/** Статусы, из которых пользователь может отменить заявку (вернуть токены). */
const USER_CANCELLABLE = ["CREATED", "PENDING_APPROVAL", "APPROVED"] as const;

export interface CancelParams {
  userId: string;
  redemptionId: string;
}

/**
 * Пользователь отменяет свою заявку (CREATED/PENDING_APPROVAL/APPROVED, ещё не
 * выдана). Возвращает токены (refundTokens, идемпотентно по `refund:{id}`),
 * восстанавливает сток, статус → REFUNDED. Повторный вызов на REFUNDED/ISSUED
 * бросает WRONG_STATUS — двойного возврата быть не может.
 */
export async function cancelRedemption(params: CancelParams): Promise<RedeemResult> {
  const { userId, redemptionId } = params;

  const { redemption, balance, reward } = await prisma.$transaction(async (tx) => {
    const existing = await tx.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { id: true, title: true, stock: true } } },
    });
    if (!existing) {
      throw new RedemptionError("NOT_FOUND", "Заявка не найдена");
    }
    if (existing.userId !== userId) {
      throw new RedemptionError("FORBIDDEN", "Это не ваша заявка");
    }
    if (!(USER_CANCELLABLE as readonly string[]).includes(existing.status)) {
      throw new RedemptionError(
        "WRONG_STATUS",
        "Эту заявку уже нельзя отменить",
      );
    }

    // Возврат токенов — идемпотентно по ключу redemptionId.
    const refund = await refundTokens({
      userId,
      amount: existing.costTokens,
      reason: `Отмена заявки на «${existing.reward.title}»`,
      refType: "reward",
      refId: existing.reward.id,
      idempotencyKey: `refund:${existing.id}`,
    });

    await restoreStock(tx, existing.reward);

    const updated = await tx.rewardRedemption.update({
      where: { id: existing.id },
      data: { status: "REFUNDED" },
    });

    return { redemption: updated, balance: refund.balance, reward: existing.reward };
  });

  await prisma.notification.create({
    data: {
      userId,
      type: "REDEMPTION_STATUS",
      title: "Заявка отменена",
      body: `«${reward.title}» — заявка отменена, ${redemption.costTokens} токенов возвращены.`,
      refType: "redemption",
      refId: redemption.id,
    },
  });

  return { redemption, balance };
}

// ─────────────────────────── Решение модератора/партнёра ───────────────────────────

export interface DecideParams {
  /** id админа или партнёра, принимающего решение (для аудита). */
  adminOrPartnerId: string;
  redemptionId: string;
  action: "approve" | "reject";
  reason?: string | null;
}

export interface DecideResult {
  redemption: RewardRedemption;
  /** Баланс пользователя-заявителя после решения (меняется только при reject). */
  balance: number;
}

/**
 * Решение по заявке PENDING_APPROVAL.
 *
 * approve → ISSUED (генерируем code, issuedAt). Токены уже списаны при резерве —
 * повторно НЕ списываем. reject → REFUNDED: возвращаем токены (refundTokens) +
 * восстанавливаем сток. Любое решение пишется в AdminAuditLog и шлёт
 * Notification(REDEMPTION_STATUS) заявителю.
 */
export async function decideRedemption(params: DecideParams): Promise<DecideResult> {
  const { adminOrPartnerId, redemptionId, action, reason = null } = params;

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.rewardRedemption.findUnique({
      where: { id: redemptionId },
      include: { reward: { select: { id: true, title: true, stock: true } } },
    });
    if (!existing) {
      throw new RedemptionError("NOT_FOUND", "Заявка не найдена");
    }
    if (existing.status !== "PENDING_APPROVAL") {
      throw new RedemptionError(
        "WRONG_STATUS",
        "Решение можно принять только по заявке на одобрении",
      );
    }

    if (action === "approve") {
      const updated = await tx.rewardRedemption.update({
        where: { id: existing.id },
        data: {
          status: "ISSUED",
          code: generateRedemptionCode(),
          issuedAt: new Date(),
        },
      });

      await tx.adminAuditLog.create({
        data: {
          adminId: adminOrPartnerId,
          action: "APPROVE_REDEMPTION",
          targetType: "redemption",
          targetId: existing.id,
          meta: { reason, rewardId: existing.reward.id },
        },
      });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: existing.userId },
        select: { cachedBalance: true },
      });

      await tx.notification.create({
        data: {
          userId: existing.userId,
          type: "REDEMPTION_STATUS",
          title: "Заявка одобрена",
          body: `«${existing.reward.title}» одобрена. Код выдачи: ${updated.code}.`,
          refType: "redemption",
          refId: existing.id,
        },
      });

      return { redemption: updated, balance: user.cachedBalance };
    }

    // reject: возврат токенов + восстановление стока + REFUNDED.
    const refund = await refundTokens({
      userId: existing.userId,
      amount: existing.costTokens,
      reason: `Отклонение заявки на «${existing.reward.title}»`,
      refType: "reward",
      refId: existing.reward.id,
      idempotencyKey: `refund:${existing.id}`,
    });

    await restoreStock(tx, existing.reward);

    const updated = await tx.rewardRedemption.update({
      where: { id: existing.id },
      data: { status: "REFUNDED" },
    });

    await tx.adminAuditLog.create({
      data: {
        adminId: adminOrPartnerId,
        action: "REJECT_REDEMPTION",
        targetType: "redemption",
        targetId: existing.id,
        meta: { reason, rewardId: existing.reward.id },
      },
    });

    await tx.notification.create({
      data: {
        userId: existing.userId,
        type: "REDEMPTION_STATUS",
        title: "Заявка отклонена",
        body: reason
          ? `«${existing.reward.title}» отклонена: ${reason}. ${existing.costTokens} токенов возвращены.`
          : `«${existing.reward.title}» отклонена. ${existing.costTokens} токенов возвращены.`,
        refType: "redemption",
        refId: existing.id,
      },
    });

    return { redemption: updated, balance: refund.balance };
  });

  return result;
}

// ─────────────────────────── Выдача партнёром (опц.) ───────────────────────────

export interface IssueParams {
  /** id партнёра-владельца награды (проверка прав в роуте). */
  partnerUserId: string;
  redemptionId: string;
}

/**
 * Партнёр помечает уже выкупленную награду как фактически выданную.
 * Здесь баланс не трогается — ISSUED уже финальный по токенам; обновляем
 * issuedAt-метку (если ещё не стояла) для трекинга использования.
 * Возврат текущего редемпшна.
 */
export async function markIssued(params: IssueParams): Promise<RewardRedemption> {
  const { redemptionId } = params;

  const existing = await prisma.rewardRedemption.findUnique({
    where: { id: redemptionId },
  });
  if (!existing) {
    throw new RedemptionError("NOT_FOUND", "Заявка не найдена");
  }
  if (existing.status !== "ISSUED" && existing.status !== "APPROVED") {
    throw new RedemptionError(
      "WRONG_STATUS",
      "Отметить выданной можно только оформленную награду",
    );
  }

  return prisma.rewardRedemption.update({
    where: { id: existing.id },
    data: { status: "ISSUED", issuedAt: existing.issuedAt ?? new Date() },
  });
}

// ─────────────────────────── Хелперы для роутов ───────────────────────────

/** Достаёт партнёра текущего пользователя (для partner-роутов). */
export function getOwnedPartner(userId: string) {
  return prisma.partner.findUnique({ where: { userId } });
}
