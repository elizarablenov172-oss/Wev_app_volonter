import { z } from "zod";

/**
 * Zod-схемы Этапа 4 «Мероприятия + чек-ин».
 * Используются в route handlers (волонтёр / организация / админ).
 */

// ─────────────────────────── Фильтры списка ───────────────────────────

/** Query-параметры GET /api/events (публичный список PUBLISHED). */
export const eventListQuerySchema = z.object({
  /** Фильтр по городу/локации (подстрока, без учёта регистра). */
  city: z.string().trim().max(120).optional(),
  /** Фильтр по категории (точное совпадение). */
  category: z.string().trim().max(80).optional(),
  /** Дата (YYYY-MM-DD или ISO): показать события на эту дату и позже. */
  date: z.string().trim().max(40).optional(),
  /** Пагинация: номер страницы (с 1). */
  page: z.coerce.number().int().min(1).default(1),
  /** Размер страницы (1..50). */
  pageSize: z.coerce.number().int().min(1).max(50).default(20),
});

export type EventListQuery = z.infer<typeof eventListQuerySchema>;

// ─────────────────────────── Чек-ин волонтёра ───────────────────────────

/** Радиус гео-чек-ина в метрах (строго на сервере). */
export const GEO_CHECKIN_RADIUS_M = 300;

/**
 * Тело POST /api/events/[id]/checkin.
 * QR → нужен qrSecret; GEO → нужны координаты пользователя.
 */
export const checkInSchema = z
  .discriminatedUnion("method", [
    z.object({
      method: z.literal("QR"),
      qrSecret: z.string().trim().min(1, "Не передан QR-код"),
    }),
    z.object({
      method: z.literal("GEO"),
      lat: z.number().min(-90).max(90),
      lng: z.number().min(-180).max(180),
    }),
  ]);

export type CheckInInput = z.infer<typeof checkInSchema>;

// ─────────────────────── Создание/редактирование (организация) ───────────────────────

const eventCoreFields = {
  title: z.string().trim().min(3, "Минимум 3 символа").max(160),
  description: z.string().trim().min(10, "Минимум 10 символов").max(5000),
  /** ISO-строка даты/времени начала. */
  startsAt: z
    .string()
    .trim()
    .refine((v) => !Number.isNaN(Date.parse(v)), "Некорректная дата начала"),
  location: z.string().trim().min(2, "Укажите место").max(200),
  geoLat: z.number().min(-90).max(90).nullable().optional(),
  geoLng: z.number().min(-180).max(180).nullable().optional(),
  capacity: z.coerce.number().int().min(1, "Минимум 1 место").max(100000),
  category: z.string().trim().min(2, "Укажите категорию").max(80),
};

/** Тело POST /api/org/events (создание). Все основные поля обязательны. */
export const eventCreateSchema = z.object(eventCoreFields).refine(
  (d) =>
    (d.geoLat == null && d.geoLng == null) ||
    (d.geoLat != null && d.geoLng != null),
  { message: "Координаты задаются парой (широта и долгота)", path: ["geoLat"] },
);

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

/** Тело PATCH /api/org/events/[id] (частичное редактирование). */
export const eventUpdateSchema = z
  .object(eventCoreFields)
  .partial()
  .refine(
    (d) =>
      d.geoLat === undefined ||
      d.geoLng === undefined ||
      (d.geoLat == null) === (d.geoLng == null),
    { message: "Координаты задаются парой (широта и долгота)", path: ["geoLat"] },
  );

export type EventUpdateInput = z.infer<typeof eventUpdateSchema>;

// ─────────────────────────── Модерация (админ) ───────────────────────────

/** Тело POST /api/admin/events/[id]/moderate. */
export const eventModerationSchema = z
  .discriminatedUnion("action", [
    z.object({
      action: z.literal("approve"),
      rewardTokens: z
        .number()
        .int("Награда — целое число")
        .positive("Награда должна быть больше нуля"),
      reason: z.string().trim().max(500).optional(),
    }),
    z.object({
      action: z.literal("reject"),
      reason: z.string().trim().max(500).optional(),
    }),
  ]);

export type EventModerationInput = z.infer<typeof eventModerationSchema>;
