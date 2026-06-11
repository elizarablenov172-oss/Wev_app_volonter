/**
 * Общие типы и хелперы фронтенда Этапа 5 «Маркетплейс наград».
 * Поля повторяют контракты API (см. /api/rewards*, /api/partner/rewards*,
 * /api/admin/redemptions*). Серверные read-страницы читают Prisma напрямую и
 * приводят результат к этим формам; мутации идут только через API.
 */

// ─────────────────────────── Доменные типы ───────────────────────────

/** Тип награды — синхронно с enum RewardType в schema.prisma. */
export type RewardType =
  | "DISCOUNT"
  | "GOODS"
  | "SERVICE"
  | "EVENT_ACCESS"
  | "TRIP"
  | "EDUCATION"
  | "MERCH"
  | "PARTNER_OFFER";

/** Статус выкупа/заявки — синхронно с enum RedemptionStatus. */
export type RedemptionStatus =
  | "CREATED"
  | "PENDING_APPROVAL"
  | "APPROVED"
  | "ISSUED"
  | "CANCELLED"
  | "REFUNDED";

/** Краткая карточка партнёра в выдаче награды. */
export interface RewardPartnerRef {
  id: string;
  brandName: string;
  description?: string | null;
}

/** Элемент публичного каталога GET /api/rewards. */
export interface RewardListItem {
  id: string;
  title: string;
  description: string;
  type: RewardType;
  costTokens: number;
  stock: number | null;
  expiresAt: string | null;
  conditions: string | null;
  imageUrl: string | null;
  requiresApproval: boolean;
  createdAt: string;
  partner: RewardPartnerRef | null;
  inStock: boolean;
  /** Хватает ли баланса (null — для неавторизованного). */
  affordable: boolean | null;
}

/** Деталь награды GET /api/rewards/[id] (поле reward). */
export interface RewardDetail {
  id: string;
  title: string;
  description: string;
  type: RewardType;
  costTokens: number;
  stock: number | null;
  expiresAt: string | null;
  conditions: string | null;
  imageUrl: string | null;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  partner: RewardPartnerRef | null;
  inStock: boolean;
  expired: boolean;
  available: boolean;
}

/** Краткий выкуп пользователя по конкретной награде (детальная страница). */
export interface MyRedemption {
  id: string;
  status: RedemptionStatus;
  code: string | null;
  costTokens: number;
  purchasedAt: string;
  issuedAt: string | null;
}

/** Ответ GET /api/rewards/[id]. */
export interface RewardDetailResponse {
  reward: RewardDetail;
  balance: number | null;
  affordable: boolean | null;
  myRedemptions: MyRedemption[] | null;
}

/** Элемент истории покупок GET /api/rewards/redemptions. */
export interface PurchaseItem {
  id: string;
  status: RedemptionStatus;
  code: string | null;
  costTokens: number;
  purchasedAt: string;
  issuedAt: string | null;
  reward: {
    id: string;
    title: string;
    type: RewardType;
    imageUrl: string | null;
    partner: { id: string; brandName: string } | null;
  };
}

/** Награда в списке партнёра GET /api/partner/rewards (+ счётчик выкупов). */
export interface PartnerRewardItem {
  id: string;
  title: string;
  description: string;
  type: RewardType;
  costTokens: number;
  stock: number | null;
  expiresAt: string | null;
  conditions: string | null;
  imageUrl: string | null;
  requiresApproval: boolean;
  isActive: boolean;
  createdAt: string;
  redemptionsCount: number;
}

/** Выкуп по награде партнёра GET /api/partner/redemptions. */
export interface PartnerRedemptionItem {
  id: string;
  status: RedemptionStatus;
  code: string | null;
  costTokens: number;
  purchasedAt: string;
  issuedAt: string | null;
  reward: { id: string; title: string; type: RewardType };
  user: { id: string; displayName: string; nickname: string | null };
}

/** Заявка в очереди модерации GET /api/admin/redemptions/pending. */
export interface PendingRedemptionItem {
  id: string;
  costTokens: number;
  purchasedAt: string;
  reward: {
    id: string;
    title: string;
    type: RewardType;
    partner: { id: string; brandName: string } | null;
  };
  user: {
    id: string;
    displayName: string;
    nickname: string | null;
    city: string | null;
  };
}

// ─────────────────────── Словари типов наград ───────────────────────

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "muted";

/**
 * Все типы наград для фильтра и формы (в порядке отображения).
 * Совпадает с REWARD_TYPES валидатора.
 */
export const REWARD_TYPE_VALUES: readonly RewardType[] = [
  "DISCOUNT",
  "GOODS",
  "SERVICE",
  "EVENT_ACCESS",
  "TRIP",
  "EDUCATION",
  "MERCH",
  "PARTNER_OFFER",
];

/** Человекочитаемая подпись + цвет бейджа для типа награды. */
export const REWARD_TYPE_META: Record<
  RewardType,
  { label: string; variant: BadgeVariant }
> = {
  DISCOUNT: { label: "Скидка", variant: "primary" },
  GOODS: { label: "Товар", variant: "primary" },
  SERVICE: { label: "Услуга", variant: "primary" },
  EVENT_ACCESS: { label: "Доступ на событие", variant: "warning" },
  TRIP: { label: "Поездка", variant: "warning" },
  EDUCATION: { label: "Обучение", variant: "success" },
  MERCH: { label: "Мерч", variant: "primary" },
  PARTNER_OFFER: { label: "Спецпредложение", variant: "muted" },
};

/** Подпись типа награды (без бейджа). */
export function rewardTypeLabel(type: RewardType): string {
  return REWARD_TYPE_META[type]?.label ?? type;
}

// ─────────────────────── Словари статусов выкупа ───────────────────────

/** Подпись + цвет бейджа для статуса выкупа/заявки. */
export const REDEMPTION_STATUS_META: Record<
  RedemptionStatus,
  { label: string; variant: BadgeVariant }
> = {
  CREATED: { label: "Создано", variant: "muted" },
  PENDING_APPROVAL: { label: "На одобрении", variant: "warning" },
  APPROVED: { label: "Одобрено", variant: "primary" },
  ISSUED: { label: "Выдано", variant: "success" },
  CANCELLED: { label: "Отменено", variant: "muted" },
  REFUNDED: { label: "Возврат", variant: "danger" },
};

/** Статусы, из которых пользователь может отменить заявку (вернуть токены). */
const USER_CANCELLABLE: readonly RedemptionStatus[] = [
  "CREATED",
  "PENDING_APPROVAL",
  "APPROVED",
];

/** Можно ли отменить выкуп с этим статусом (возврат токенов). */
export function canCancelRedemption(status: RedemptionStatus): boolean {
  return USER_CANCELLABLE.includes(status);
}

/** Выкуп уже фактически выдан (есть код). */
export function isIssued(status: RedemptionStatus): boolean {
  return status === "ISSUED";
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

/** «10 июня 2026» */
export function formatRewardDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATE_FMT.format(d);
}

/** «10 июня, 14:30» */
export function formatRewardDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return DATETIME_FMT.format(d);
}

/** ISO-строку даты приводит к значению для <input type="date"> (UTC-день). */
export function isoToDateInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Имя пользователя для таблиц: «Имя (@ник)» либо просто имя. */
export function userDisplay(user: {
  displayName: string;
  nickname: string | null;
}): string {
  return user.nickname ? `${user.displayName} · @${user.nickname}` : user.displayName;
}
