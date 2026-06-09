import * as React from "react";
import Link from "next/link";
import {
  Pencil,
  UserPlus,
  MessageCircle,
  MapPin,
  Coins,
  Users,
  CalendarCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatTokens } from "@/lib/utils";

export interface ProfileHeaderStats {
  /** Кол-во мероприятий (пока заглушка — следующий этап). */
  events?: number;
  /** Кол-во друзей (пока заглушка — следующий этап). */
  friends?: number;
  /** Баланс токенов. */
  balance: number;
}

export interface ProfileHeaderProps {
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  city: string | null;
  /** Название уровня (бейдж). */
  levelName?: string | null;
  stats: ProfileHeaderStats;
  /** Свой профиль → кнопка «Редактировать»; чужой → «Добавить»/«Написать». */
  isOwner: boolean;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/**
 * Шапка профиля: cover-градиент primary, аватар внахлёст, имя/ник,
 * бейдж уровня, статистика (мероприятия / друзья / баланс) и кнопки действий.
 */
export function ProfileHeader({
  displayName,
  nickname,
  avatarUrl,
  city,
  levelName,
  stats,
  isOwner,
}: ProfileHeaderProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* Cover — мягкий градиент в фирменном фиолетовом с паттерном-точками. */}
      <div
        className="h-28 bg-primary-soft sm:h-36"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(81,28,233,0.18) 1px, transparent 0), linear-gradient(120deg, rgba(81,28,233,0.12), rgba(81,28,233,0))",
          backgroundSize: "16px 16px, 100% 100%",
        }}
        aria-hidden
      />

      <div className="px-4 pb-5 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end">
            {/* Аватар внахлёст на cover. */}
            <div className="-mt-12 sm:-mt-14">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="size-24 rounded-full border-4 border-surface bg-surface-muted object-cover shadow-md sm:size-28"
                />
              ) : (
                <span
                  className="flex size-24 items-center justify-center rounded-full border-4 border-surface bg-primary text-3xl font-extrabold text-on-primary shadow-md sm:size-28"
                  aria-hidden
                >
                  {initials(displayName)}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
                  {displayName}
                </h1>
                {levelName && <Badge variant="primary">{levelName}</Badge>}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
                {nickname && <span>@{nickname}</span>}
                {city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-3.5" aria-hidden />
                    {city}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Действия */}
          <div className="flex shrink-0 gap-2">
            {isOwner ? (
              <Link
                href="/profile/edit"
                className={cn(buttonVariants({ variant: "primary", size: "sm" }))}
              >
                <Pencil className="size-4" aria-hidden />
                Редактировать
              </Link>
            ) : (
              <>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "primary", size: "sm" }),
                  )}
                  disabled
                  title="Раздел «Друзья» появится на следующем этапе"
                >
                  <UserPlus className="size-4" aria-hidden />
                  Добавить
                </button>
                <button
                  type="button"
                  className={cn(
                    buttonVariants({ variant: "secondary", size: "sm" }),
                  )}
                  disabled
                  title="Чат появится на следующем этапе"
                >
                  <MessageCircle className="size-4" aria-hidden />
                  Написать
                </button>
              </>
            )}
          </div>
        </div>

        {/* Статистика */}
        <dl className="mt-5 grid grid-cols-3 gap-2 rounded-lg bg-surface-muted p-3 text-center">
          <Stat
            icon={CalendarCheck}
            label="Мероприятия"
            value={formatTokens(stats.events ?? 0)}
          />
          <Stat
            icon={Users}
            label="Друзья"
            value={formatTokens(stats.friends ?? 0)}
          />
          <Stat
            icon={Coins}
            label="Баланс"
            value={formatTokens(stats.balance)}
          />
        </dl>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <Icon className="size-4 text-muted" aria-hidden />
      <dd className="tabular text-base font-bold leading-none">{value}</dd>
      <dt className="text-xs text-muted">{label}</dt>
    </div>
  );
}
