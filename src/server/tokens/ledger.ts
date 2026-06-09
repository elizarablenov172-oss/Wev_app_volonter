import { Prisma, type TokenTransaction, type TxType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Ledger-ядро токеномики (ТЗ 3.3, 3.9, 3.14).
 *
 * ИСТОЧНИК ИСТИНЫ — таблица `TokenTransaction`. `User.cachedBalance` —
 * денормализованный кэш, который ОБЯЗАТЕЛЬНО обновляется в той же
 * транзакции, что и запись операции. Любая мутация баланса проходит
 * через `prisma.$transaction`, токены — только целые, баланс не уходит
 * в минус.
 */

/** Транзакционный клиент Prisma (внутри `$transaction`). */
type Tx = Prisma.TransactionClient;

/** Ошибка: недостаточно токенов для списания. */
export class InsufficientTokensError extends Error {
  readonly balance: number;
  readonly required: number;

  constructor(balance: number, required: number) {
    super("Недостаточно токенов для операции");
    this.name = "InsufficientTokensError";
    this.balance = balance;
    this.required = required;
  }
}

/** Ошибка: некорректная сумма (не целое или ≤ 0). */
export class InvalidAmountError extends Error {
  constructor(message = "Сумма должна быть целым числом больше нуля") {
    super(message);
    this.name = "InvalidAmountError";
  }
}

/** Результат начисления. `awarded` = 0, если сработала идемпотентность. */
export interface EarnResult {
  transaction: TokenTransaction;
  balance: number;
  awarded: number;
}

/** Результат списания. */
export interface SpendResult {
  transaction: TokenTransaction;
  balance: number;
}

/** Проверяет, что сумма — положительное целое. */
function assertPositiveInt(amount: number): void {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new InvalidAmountError();
  }
}

/** Проверяет, что сумма — ненулевое целое (для корректировок ±). */
function assertNonZeroInt(amount: number): void {
  if (!Number.isInteger(amount) || amount === 0) {
    throw new InvalidAmountError(
      "Сумма корректировки должна быть ненулевым целым числом",
    );
  }
}

// ─────────────────────────── Начисление ───────────────────────────

export interface EarnParams {
  userId: string;
  amount: number;
  type: TxType;
  reason: string;
  refType?: string | null;
  refId?: string | null;
  ruleId?: string | null;
  idempotencyKey?: string | null;
  /** id админа/системы, инициировавшего операцию (для аудита). */
  createdBy?: string | null;
}

/**
 * Начисляет токены пользователю (`amount > 0`).
 *
 * Идемпотентность (антифрод ТЗ 3.9): если задан `idempotencyKey` и операция
 * с этим ключом уже существует — возвращаем её без повторного начисления
 * (`awarded = 0`). Гонку по уникальному индексу ловим как P2002.
 */
export async function earnTokens(params: EarnParams): Promise<EarnResult> {
  const {
    userId,
    amount,
    type,
    reason,
    refType = null,
    refId = null,
    ruleId = null,
    idempotencyKey = null,
    createdBy = null,
  } = params;

  assertPositiveInt(amount);

  try {
    return await prisma.$transaction(async (tx: Tx) => {
      // Идемпотентность: уже начисляли по этому ключу — отдаём существующую.
      if (idempotencyKey) {
        const existing = await tx.tokenTransaction.findUnique({
          where: { idempotencyKey },
        });
        if (existing) {
          const user = await tx.user.findUniqueOrThrow({
            where: { id: userId },
            select: { cachedBalance: true },
          });
          return {
            transaction: existing,
            balance: user.cachedBalance,
            awarded: 0,
          };
        }
      }

      const transaction = await tx.tokenTransaction.create({
        data: {
          userId,
          amount,
          type,
          reason,
          ruleId,
          refType,
          refId,
          idempotencyKey,
          createdBy,
        },
      });

      const user = await tx.user.update({
        where: { id: userId },
        data: { cachedBalance: { increment: amount } },
        select: { cachedBalance: true },
      });

      return { transaction, balance: user.cachedBalance, awarded: amount };
    });
  } catch (error) {
    // Гонка: параллельный запрос успел вставить ту же idempotencyKey.
    if (
      idempotencyKey &&
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existing = await prisma.tokenTransaction.findUnique({
        where: { idempotencyKey },
      });
      const balance = await getBalance(userId);
      if (existing) {
        return { transaction: existing, balance, awarded: 0 };
      }
    }
    throw error;
  }
}

// ─────────────────────────── Списание ───────────────────────────

export interface SpendParams {
  userId: string;
  amount: number;
  reason: string;
  refType: string;
  refId: string;
  idempotencyKey?: string | null;
  createdBy?: string | null;
}

/**
 * Списывает токены (`amount > 0` — стоимость). Бросает
 * `InsufficientTokensError`, если баланса не хватает. Баланс не уходит в минус.
 */
export async function spendTokens(params: SpendParams): Promise<SpendResult> {
  const {
    userId,
    amount,
    reason,
    refType,
    refId,
    idempotencyKey = null,
    createdBy = null,
  } = params;

  assertPositiveInt(amount);

  return prisma.$transaction(async (tx: Tx) => {
    if (idempotencyKey) {
      const existing = await tx.tokenTransaction.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        const user = await tx.user.findUniqueOrThrow({
          where: { id: userId },
          select: { cachedBalance: true },
        });
        return { transaction: existing, balance: user.cachedBalance };
      }
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { cachedBalance: true },
    });

    if (user.cachedBalance < amount) {
      throw new InsufficientTokensError(user.cachedBalance, amount);
    }

    const transaction = await tx.tokenTransaction.create({
      data: {
        userId,
        amount: -amount,
        type: "SPEND_REWARD",
        reason,
        refType,
        refId,
        idempotencyKey,
        createdBy,
      },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data: { cachedBalance: { decrement: amount } },
      select: { cachedBalance: true },
    });

    return { transaction, balance: updated.cachedBalance };
  });
}

// ─────────────────────────── Возврат ───────────────────────────

export interface RefundParams {
  userId: string;
  amount: number;
  reason: string;
  refType?: string | null;
  refId?: string | null;
  idempotencyKey?: string | null;
  createdBy?: string | null;
}

/** Возврат токенов (`REFUND`, +). Например, при отмене крупной награды. */
export function refundTokens(params: RefundParams): Promise<EarnResult> {
  return earnTokens({ ...params, type: "REFUND" });
}

// ─────────────────────── Админ-корректировка ───────────────────────

export interface AdminAdjustParams {
  userId: string;
  /** ± целое (положительное — добавить, отрицательное — отнять). */
  amount: number;
  reason: string;
  createdBy: string;
  refType?: string | null;
  refId?: string | null;
}

/**
 * Ручная корректировка баланса админом (`ADMIN_ADJUST`, ±).
 * При отрицательной сумме баланс не уходит в минус.
 */
export async function adminAdjust(
  params: AdminAdjustParams,
): Promise<SpendResult> {
  const { userId, amount, reason, createdBy, refType = null, refId = null } =
    params;

  assertNonZeroInt(amount);

  return prisma.$transaction(async (tx: Tx) => {
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      select: { cachedBalance: true },
    });

    if (amount < 0 && user.cachedBalance + amount < 0) {
      throw new InsufficientTokensError(user.cachedBalance, -amount);
    }

    const transaction = await tx.tokenTransaction.create({
      data: {
        userId,
        amount,
        type: "ADMIN_ADJUST",
        reason,
        refType,
        refId,
        createdBy,
      },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data: { cachedBalance: { increment: amount } },
      select: { cachedBalance: true },
    });

    return { transaction, balance: updated.cachedBalance };
  });
}

// ─────────────────────────── Чтение / сервис ───────────────────────────

/** Возвращает текущий (кэшированный) баланс пользователя. */
export async function getBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cachedBalance: true },
  });
  return user?.cachedBalance ?? 0;
}

/**
 * Служебная починка: пересчитывает баланс как `SUM(amount)` по журналу и
 * записывает результат в кэш. Возвращает выверенный баланс.
 */
export async function recomputeBalance(userId: string): Promise<number> {
  return prisma.$transaction(async (tx: Tx) => {
    const agg = await tx.tokenTransaction.aggregate({
      where: { userId },
      _sum: { amount: true },
    });
    const balance = agg._sum.amount ?? 0;
    await tx.user.update({
      where: { id: userId },
      data: { cachedBalance: balance },
    });
    return balance;
  });
}
