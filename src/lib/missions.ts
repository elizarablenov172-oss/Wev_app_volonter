/** Типы и словари фронтенда модуля «Задания/Миссии» (Этап 6). */

export type MissionStatus =
  | "AVAILABLE"
  | "ACCEPTED"
  | "PENDING_REVIEW"
  | "COMPLETED"
  | "REJECTED"
  | "EXPIRED";

export type ProofMethod = "OAUTH" | "UTM_LINK" | "PROMO_QR" | "SCREENSHOT";

type BadgeVariant = "primary" | "success" | "warning" | "danger" | "muted";

export interface MissionListItem {
  id: string;
  title: string;
  description: string;
  targetUrl: string | null;
  instruction: string | null;
  rewardTokens: number;
  deadline: string | null;
  audience: string | null;
  proofMethod: ProofMethod;
  createdAt: string;
  myStatus: MissionStatus | null;
}

export interface MissionSubmissionView {
  id: string;
  status: MissionStatus;
  proofUrl: string | null;
  proofData: unknown;
  moderatorNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** Подпись + цвет статуса задания. */
export const MISSION_STATUS_META: Record<
  MissionStatus,
  { label: string; variant: BadgeVariant }
> = {
  AVAILABLE: { label: "Доступно", variant: "primary" },
  ACCEPTED: { label: "В работе", variant: "warning" },
  PENDING_REVIEW: { label: "На проверке", variant: "warning" },
  COMPLETED: { label: "Выполнено", variant: "success" },
  REJECTED: { label: "Отклонено", variant: "danger" },
  EXPIRED: { label: "Просрочено", variant: "muted" },
};

/** Способ проверки → человекочитаемая подпись. */
export const PROOF_METHOD_META: Record<ProofMethod, string> = {
  OAUTH: "Привязка аккаунта",
  UTM_LINK: "Переход по ссылке",
  PROMO_QR: "Промокод / QR",
  SCREENSHOT: "Скриншот + модерация",
};

export const PROOF_METHOD_VALUES: readonly ProofMethod[] = [
  "SCREENSHOT",
  "UTM_LINK",
  "PROMO_QR",
  "OAUTH",
];

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "long",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatMissionDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : DATE_FMT.format(d);
}

/** Отображаемое имя пользователя: имя, либо @ник. */
export function userDisplay(u: { displayName: string; nickname: string | null }): string {
  return u.displayName || (u.nickname ? `@${u.nickname}` : "Пользователь");
}

export function isoToDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
