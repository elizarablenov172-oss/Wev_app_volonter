/**
 * Общие типы и хелперы фронтенда Этапа 4 «Мероприятия + чек-ин».
 * Поля повторяют контракты API (см. /api/events*, /api/org/events*, /api/admin/events*).
 */

// ─────────────────────────── Доменные типы ───────────────────────────

export type EventStatus =
  | "DRAFT"
  | "PENDING"
  | "PUBLISHED"
  | "REJECTED"
  | "ARCHIVED";

export type ParticipationStatus =
  | "REGISTERED"
  | "CHECKED_IN"
  | "CONFIRMED"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export type CheckInMethod = "QR" | "GEO" | "ORG_CONFIRM";

/** Краткая карточка организации в выдаче события. */
export interface EventOrganizationRef {
  id: string;
  name: string;
  description?: string | null;
}

/** Элемент публичного списка GET /api/events. */
export interface EventListItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  geoLat: number | null;
  geoLng: number | null;
  capacity: number;
  category: string;
  rewardTokens: number;
  status: EventStatus;
  organization: EventOrganizationRef;
  participantsCount: number;
  spotsLeft: number;
}

export interface EventListResponse {
  items: EventListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** Статус участия текущего пользователя на детальной странице. */
export interface MyParticipation {
  id: string;
  status: ParticipationStatus;
  checkInMethod: CheckInMethod | null;
  checkedInAt: string | null;
  rewarded: boolean;
}

/** Деталь события GET /api/events/[id]. */
export interface EventDetail {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  geoLat: number | null;
  geoLng: number | null;
  capacity: number;
  category: string;
  rewardTokens: number;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  organization: EventOrganizationRef;
  participantsCount: number;
  spotsLeft: number;
}

export interface EventDetailResponse {
  event: EventDetail;
  isOwner: boolean;
  myParticipation: MyParticipation | null;
}

/** Элемент списка мероприятий организации GET /api/org/events. */
export interface OrgEventItem {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  category: string;
  capacity: number;
  rewardTokens: number;
  status: EventStatus;
  createdAt: string;
  participantsCount: number;
}

/** Участник в таблице организации. */
export interface ParticipantItem {
  participationId: string;
  status: ParticipationStatus;
  checkInMethod: CheckInMethod | null;
  checkedInAt: string | null;
  rewarded: boolean;
  joinedAt: string;
  user: {
    id: string;
    displayName: string;
    nickname: string | null;
    avatarUrl: string | null;
    city: string | null;
  };
}

export interface ParticipantsResponse {
  event: { id: string; title: string; capacity: number };
  participantsCount: number;
  items: ParticipantItem[];
}

/** Элемент очереди модерации GET /api/admin/events/moderation. */
export interface ModerationEventItem {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  location: string;
  category: string;
  capacity: number;
  rewardTokens: number;
  createdAt: string;
  organization: { id: string; name: string; status: string };
}

// ─────────────────────────── Категории ───────────────────────────

/**
 * Известные категории (для фильтра и подсказок при создании).
 * Поле category — свободная строка, поэтому список лишь рекомендательный.
 */
export const EVENT_CATEGORIES = [
  "Экология",
  "Дети",
  "Здоровье",
  "Животные",
  "Культура",
  "Спорт",
  "Образование",
  "Пожилые люди",
  "Город",
  "Другое",
] as const;

// ─────────────────────── Словари статусов ───────────────────────

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "muted";

/** Человекочитаемая подпись + цвет бейджа для статуса события. */
export const EVENT_STATUS_META: Record<
  EventStatus,
  { label: string; variant: BadgeVariant }
> = {
  DRAFT: { label: "Черновик", variant: "muted" },
  PENDING: { label: "На модерации", variant: "warning" },
  PUBLISHED: { label: "Опубликовано", variant: "success" },
  REJECTED: { label: "Отклонено", variant: "danger" },
  ARCHIVED: { label: "В архиве", variant: "muted" },
};

/** Подпись + цвет бейджа для статуса участия. */
export const PARTICIPATION_STATUS_META: Record<
  ParticipationStatus,
  { label: string; variant: BadgeVariant }
> = {
  REGISTERED: { label: "Записан", variant: "primary" },
  CHECKED_IN: { label: "Отметился", variant: "warning" },
  CONFIRMED: { label: "Подтверждён", variant: "success" },
  COMPLETED: { label: "Завершён", variant: "success" },
  CANCELLED: { label: "Отменён", variant: "muted" },
  NO_SHOW: { label: "Не явился", variant: "danger" },
};

/** Подпись способа чек-ина. */
export const CHECKIN_METHOD_LABEL: Record<CheckInMethod, string> = {
  QR: "QR-код",
  GEO: "Геолокация",
  ORG_CONFIRM: "Организатором",
};

/** Статус участия, при котором награда уже выдана/участие подтверждено. */
export function isConfirmedStatus(status: ParticipationStatus): boolean {
  return status === "CONFIRMED" || status === "COMPLETED";
}

/** Активное (не отменённое) участие, по которому возможен чек-ин. */
export function canCheckIn(status: ParticipationStatus): boolean {
  return status === "REGISTERED" || status === "CHECKED_IN";
}

// ─────────────────────────── Формат дат ───────────────────────────

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

const DATETIME_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

const TIME_FMT = new Intl.DateTimeFormat("ru-RU", {
  hour: "2-digit",
  minute: "2-digit",
});

/** «10 июня 2026» */
export function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

/** «10 июня, 14:30» */
export function formatEventDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d);
}

/** «14:30» */
export function formatEventTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return TIME_FMT.format(d);
}

/** ISO-строку приводит к значению для <input type="datetime-local"> (локальное время). */
export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
