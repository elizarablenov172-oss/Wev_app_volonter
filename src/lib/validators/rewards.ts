import { z } from "zod";

/**
 * Zod-схемы Этапа 5 «Маркетплейс наград».
 * Используются в route handlers (волонтёр / партнёр / админ).
 */

/** Типы наград — синхронно с enum RewardType в schema.prisma. */
export const REWARD_TYPES = [
  "DISCOUNT",
  "GOODS",
  "SERVICE",
  "EVENT_ACCESS",
  "TRIP",
  "EDUCATION",
  "MERCH",
  "PARTNER_OFFER",
] as const;

/**
 * Типы наград, которые по умолчанию требуют одобрения (резерв + модерация
 * заявки): крупные/ограниченные. Партнёр может переопределить флаг вручную.
 */
export const APPROVAL_REQUIRED_BY_DEFAULT: readonly (typeof REWARD_TYPES)[number][] = [
  "TRIP",
  "EVENT_ACCESS",
];

// ─────────────────────────── Каталог (волонтёр) ───────────────────────────

/** Query-параметры GET /api/rewards (публичный каталог isActive-наград). */
export const rewardListQuerySchema = z.object({
  /** Фильтр по типу награды (точное совпадение). */
  type: z.enum(REWARD_TYPES).optional(),
  /** Верхняя граница стоимости в токенах. */
  maxCost: z.coerce.number().int().min(0).optional(),
  /** Сортировка: дешевле→дороже / дороже→дешевле / новые. */
  sort: z.enum(["cost_asc", "cost_desc", "new"]).default("new"),
});

export type RewardListQuery = z.infer<typeof rewardListQuerySchema>;

// ─────────────────────── Создание/редактирование (партнёр) ───────────────────────

const rewardCoreFields = {
  title: z.string().trim().min(3, "Минимум 3 символа").max(160),
  description: z.string().trim().min(5, "Минимум 5 символов").max(5000),
  type: z.enum(REWARD_TYPES),
  costTokens: z
    .coerce.number()
    .int("Стоимость — целое число")
    .positive("Стоимость должна быть больше нуля"),
  /** null/не задано = безлимитный сток. */
  stock: z.coerce.number().int().min(0, "Сток не может быть отрицательным").nullable().optional(),
  /** ISO-строка даты истечения (опционально). */
  expiresAt: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Некорректная дата истечения")
    .nullable()
    .optional(),
  conditions: z.string().trim().max(2000).nullable().optional(),
  imageUrl: z.string().trim().url("Некорректная ссылка на изображение").max(500).nullable().optional(),
  /**
   * Требует одобрения. Если не передан — вычисляется по типу
   * (APPROVAL_REQUIRED_BY_DEFAULT) на стороне сервиса/роута.
   */
  requiresApproval: z.boolean().optional(),
};

/** Тело POST /api/partner/rewards (создание награды). */
export const rewardCreateSchema = z.object(rewardCoreFields);

export type RewardCreateInput = z.infer<typeof rewardCreateSchema>;

/** Тело PATCH /api/partner/rewards/[id] (частичное редактирование + isActive). */
export const rewardUpdateSchema = z
  .object({
    ...rewardCoreFields,
    isActive: z.boolean().optional(),
  })
  .partial();

export type RewardUpdateInput = z.infer<typeof rewardUpdateSchema>;

// ─────────────────────────── Решение по заявке ───────────────────────────

/** Тело POST /api/admin/redemptions/[id]/decision и партнёрского решения. */
export const redemptionDecisionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    reason: z.string().trim().max(500).optional(),
  }),
]);

export type RedemptionDecisionInput = z.infer<typeof redemptionDecisionSchema>;
