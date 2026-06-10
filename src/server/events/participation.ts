import { Prisma, type CheckInMethod, type Participation } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { earnTokens } from "@/server/tokens/ledger";

/**
 * Сервис подтверждения участия в мероприятии (Этап 4).
 *
 * Единая точка начисления награды за участие — переиспользуется всеми тремя
 * способами чек-ина (QR / GEO / ручное подтверждение организацией).
 *
 * Гарантия «одно участие = одна награда»:
 *   - флаг `Participation.rewarded` — быстрая проверка;
 *   - идемпотентный ключ ledger `part:{participationId}` — жёсткая защита
 *     даже при гонке/повторных чек-инах (см. earnTokens, антифрод ТЗ 3.9).
 *
 * Геолокация и QR-секрет проверяются ДО вызова этой функции (в route handler);
 * здесь — только перевод статуса + начисление + лента/уведомление.
 */

/** Ошибки доменного слоя участия (для аккуратных HTTP-кодов в роуте). */
export class ParticipationError extends Error {
  readonly code:
    | "NOT_FOUND" // участия нет
    | "WRONG_STATUS" // нельзя подтвердить из текущего статуса
    | "EVENT_NOT_FOUND"; // событие не найдено

  constructor(code: ParticipationError["code"], message: string) {
    super(message);
    this.name = "ParticipationError";
    this.code = code;
  }
}

/** Статусы участия, из которых разрешено подтверждение. */
const CONFIRMABLE_FROM = ["REGISTERED", "CHECKED_IN"] as const;

export interface ConfirmParticipationParams {
  /** Прямая ссылка на участие — приоритетнее пары (userId,eventId). */
  participationId?: string;
  userId?: string;
  eventId?: string;
  /** Способ подтверждения. */
  method: CheckInMethod;
  /** id организации/админа при ручном подтверждении (ORG_CONFIRM). */
  confirmedById?: string | null;
}

export interface ConfirmParticipationResult {
  participation: Participation;
  /** Сколько токенов фактически начислено (0 при повторе — награда уже была). */
  awarded: number;
  /** Баланс волонтёра после операции. */
  balance: number;
  /** true, если статус только что переведён в CONFIRMED этим вызовом. */
  justConfirmed: boolean;
}

/** Находит участие по id либо по паре (userId,eventId). */
async function loadParticipation(
  params: ConfirmParticipationParams,
): Promise<Participation> {
  const { participationId, userId, eventId } = params;

  if (participationId) {
    const p = await prisma.participation.findUnique({
      where: { id: participationId },
    });
    if (!p) {
      throw new ParticipationError("NOT_FOUND", "Запись об участии не найдена");
    }
    return p;
  }

  if (userId && eventId) {
    const p = await prisma.participation.findUnique({
      where: { userId_eventId: { userId, eventId } },
    });
    if (!p) {
      throw new ParticipationError("NOT_FOUND", "Запись об участии не найдена");
    }
    return p;
  }

  throw new ParticipationError(
    "NOT_FOUND",
    "Не указан идентификатор участия",
  );
}

/**
 * Подтверждает участие и начисляет награду (идемпотентно).
 *
 * Шаги:
 *   1. Перевод участия REGISTERED/CHECKED_IN → CONFIRMED (если ещё нет).
 *   2. Если `!rewarded` и `event.rewardTokens > 0` — начисление через ledger
 *      с ключом `part:{participationId}` и установка `rewarded = true`.
 *   3. Запись в ленту активности (EVENT_DONE) + уведомление (TOKEN_EARN).
 *
 * Повторный вызов на уже подтверждённом участии награду не дублирует.
 */
export async function confirmParticipation(
  params: ConfirmParticipationParams,
): Promise<ConfirmParticipationResult> {
  const { method, confirmedById = null } = params;

  const participation = await loadParticipation(params);

  // Уже отменено / no-show — подтверждать нечего.
  if (
    participation.status === "CANCELLED" ||
    participation.status === "NO_SHOW"
  ) {
    throw new ParticipationError(
      "WRONG_STATUS",
      "Участие отменено — подтверждение невозможно",
    );
  }

  const event = await prisma.event.findUnique({
    where: { id: participation.eventId },
    select: { id: true, title: true, rewardTokens: true },
  });
  if (!event) {
    throw new ParticipationError("EVENT_NOT_FOUND", "Мероприятие не найдено");
  }

  // 1. Перевод в CONFIRMED, если ещё не подтверждено.
  const needsConfirm = (CONFIRMABLE_FROM as readonly string[]).includes(
    participation.status,
  );
  let current = participation;
  let justConfirmed = false;

  if (needsConfirm) {
    current = await prisma.participation.update({
      where: { id: participation.id },
      data: {
        status: "CONFIRMED",
        checkInMethod: method,
        checkedInAt: current.checkedInAt ?? new Date(),
        confirmedById,
      },
    });
    justConfirmed = true;
  }

  // 2. Начисление награды (идемпотентно по participationId).
  let awarded = 0;
  let balance = 0;
  const idempotencyKey = `part:${current.id}`;

  if (!current.rewarded && event.rewardTokens > 0) {
    const earn = await earnTokens({
      userId: current.userId,
      amount: event.rewardTokens,
      type: "EARN_EVENT",
      reason: `Участие в мероприятии «${event.title}»`,
      refType: "event",
      refId: event.id,
      idempotencyKey,
      createdBy: confirmedById,
    });
    awarded = earn.awarded;
    balance = earn.balance;

    // Помечаем участие как вознаграждённое (ledger уже защитил от дубля).
    current = await prisma.participation.update({
      where: { id: current.id },
      data: { rewarded: true },
    });
  } else {
    // Награды нет или уже выдана — просто читаем актуальный баланс.
    const user = await prisma.user.findUnique({
      where: { id: current.userId },
      select: { cachedBalance: true },
    });
    balance = user?.cachedBalance ?? 0;
  }

  // 3. Лента активности + уведомление — только когда реально что-то произошло.
  if (justConfirmed || awarded > 0) {
    const tokensText =
      awarded > 0 ? ` +${awarded} токенов` : "";
    await prisma.activityFeedItem.create({
      data: {
        userId: current.userId,
        type: "EVENT_DONE",
        refType: "event",
        refId: event.id,
        text: `Участие в «${event.title}»${tokensText}`,
        visibility: "PUBLIC",
      },
    });

    if (awarded > 0) {
      await prisma.notification.create({
        data: {
          userId: current.userId,
          type: "TOKEN_EARN",
          title: "Начислены токены за участие",
          body: `Участие в «${event.title}»: +${awarded} токенов`,
          refType: "event",
          refId: event.id,
        },
      });
    }
  }

  return { participation: current, awarded, balance, justConfirmed };
}

/** Расстояние между точками (метры) по формуле гаверсинусов. */
export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 6_371_000; // радиус Земли, м
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/**
 * Хелпер: достаёт организацию текущего пользователя (для org-роутов).
 * Возвращает null, если у пользователя нет организации.
 */
export async function getOwnedOrganization(userId: string) {
  return prisma.organization.findUnique({ where: { userId } });
}

/** Считает активные (не отменённые) участия события — для контроля capacity. */
export function countActiveParticipations(
  tx: Prisma.TransactionClient | typeof prisma,
  eventId: string,
): Promise<number> {
  return tx.participation.count({
    where: { eventId, status: { not: "CANCELLED" } },
  });
}
