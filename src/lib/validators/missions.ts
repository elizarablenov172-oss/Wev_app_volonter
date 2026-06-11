import { z } from "zod";

/**
 * Zod-схемы модуля «Задания/Миссии» (Этап 6).
 * Используются в route handlers (волонтёр / админ).
 */

// ─────────────────────────── Список (волонтёр) ───────────────────────────

/** Query-параметры GET /api/missions. */
export const missionListQuerySchema = z.object({
  /** Пагинация: номер страницы (с 1). */
  page: z.coerce.number().int().min(1).default(1),
  /** Размер страницы (1..50). */
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type MissionListQuery = z.infer<typeof missionListQuerySchema>;

// ─────────────────────── Создание/редактирование (админ) ───────────────────────

/** Допустимые методы подтверждения (совпадают с enum ProofMethod). */
const proofMethodEnum = z.enum(["OAUTH", "UTM_LINK", "PROMO_QR", "SCREENSHOT"]);

const missionCoreFields = {
  title: z.string().trim().min(3, "Минимум 3 символа").max(160),
  description: z.string().trim().min(10, "Минимум 10 символов").max(5000),
  targetUrl: z
    .string()
    .trim()
    .url("Некорректная ссылка")
    .max(2000)
    .nullable()
    .optional(),
  instruction: z.string().trim().max(5000).nullable().optional(),
  rewardTokens: z
    .number()
    .int("Награда — целое число")
    .positive("Награда должна быть больше нуля"),
  /** ISO-строка дедлайна (или null — без дедлайна). */
  deadline: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Некорректная дата дедлайна")
    .nullable()
    .optional(),
  audience: z.string().trim().max(200).nullable().optional(),
  proofMethod: proofMethodEnum.optional(),
};

/** Тело POST /api/admin/missions (создание). Основные поля обязательны. */
export const missionCreateSchema = z.object(missionCoreFields);

export type MissionCreateInput = z.infer<typeof missionCreateSchema>;

/** Тело PATCH /api/admin/missions/[id] (частичное редактирование). */
export const missionUpdateSchema = z
  .object({ ...missionCoreFields, isActive: z.boolean().optional() })
  .partial();

export type MissionUpdateInput = z.infer<typeof missionUpdateSchema>;

// ─────────────────────────── Сдача пруфа (волонтёр) ───────────────────────────

/**
 * Тело JSON-варианта POST /api/missions/[id]/submit-proof.
 * Для скриншота используется multipart (поле `file`) — он обрабатывается
 * в route handler, эта схема покрывает ссылку/код/произвольные данные пруфа.
 * Должен быть передан хотя бы proofUrl или proofData.
 */
export const submitProofSchema = z
  .object({
    /** Готовая ссылка на пруф (например, на пост/скрин во внешнем хранилище). */
    proofUrl: z.string().trim().url("Некорректная ссылка").max(2000).optional(),
    /** Произвольные данные пруфа: { link?, code?, note? } и т.п. */
    proofData: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((d) => d.proofUrl != null || d.proofData != null, {
    message: "Передайте ссылку (proofUrl) или данные пруфа (proofData)",
    path: ["proofUrl"],
  });

export type SubmitProofInput = z.infer<typeof submitProofSchema>;

// ─────────────────────────── Проверка сабмишна (админ) ───────────────────────────

/** Тело POST /api/admin/missions/submissions/[id]/verify. */
export const verifySubmissionSchema = z.object({
  action: z.enum(["approve", "reject"]),
  note: z.string().trim().max(500).optional(),
});

export type VerifySubmissionInput = z.infer<typeof verifySubmissionSchema>;
