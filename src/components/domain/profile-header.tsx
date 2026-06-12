import * as React from "react";
import Link from "next/link";
import type { Icon } from "@phosphor-icons/react";
import {
  PencilSimple,
  MapPin,
  Coins,
  UsersThree,
  CalendarCheck,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { ProfileActions } from "@/components/domain/profile-actions";
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
  /** id пользователя профиля — нужен для действий «Добавить»/«Написать». */
  userId: string;
  /** Свой профиль → кнопка «Редактировать»; чужой → «Добавить»/«Написать». */
  isOwner: boolean;
  /** Показывать статистику (мероприятия/друзья/баланс) — только для волонтёра. */
  showStats?: boolean;
  /**
   * Компоновка на десктопе (≥lg):
   *  • "wide" — карточка в ряд (когда занимает всю ширину);
   *  • "compact" — вертикальная карточка для узкой боковой колонки
   *    (крупный аватар сверху, статистика — вертикальным списком).
   * На мобиле всегда горизонтальная компоновка (как раньше).
   */
  layout?: "wide" | "compact";
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
 * Шапка профиля в стиле dashboard.
 *
 * Адаптивна:
 *  • mobile (<lg) — горизонтальная карточка: аватар слева, имя/ник/город рядом,
 *    действия справа, статистика — табличным рядом из трёх колонок;
 *  • desktop "wide" (≥lg) — то же в ряд на всю ширину;
 *  • desktop "compact" (≥lg) — вертикальная карточка для узкой боковой колонки:
 *    крупный аватар по центру сверху, действия на всю ширину, статистика —
 *    вертикальным списком с hairline-разделителями.
 */
export function ProfileHeader({
  displayName,
  nickname,
  avatarUrl,
  city,
  levelName,
  stats,
  userId,
  isOwner,
  showStats = true,
  layout = "wide",
}: ProfileHeaderProps) {
  const compact = layout === "compact";

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
      <div
        className={cn(
          "flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between",
          // В compact-режиме на десктопе возвращаемся к вертикальной колонке,
          // выровненной по центру.
          compact && "lg:flex-col lg:items-center lg:gap-5 lg:text-center",
        )}
      >
        <div
          className={cn(
            "flex items-center gap-4",
            compact && "lg:w-full lg:flex-col lg:gap-3",
          )}
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={displayName}
              className={cn(
                "size-16 shrink-0 rounded-md border border-border bg-surface-muted object-cover sm:size-20",
                compact && "lg:size-28",
              )}
            />
          ) : (
            <span
              className={cn(
                "flex size-16 shrink-0 items-center justify-center rounded-md bg-primary text-2xl font-extrabold text-on-primary sm:size-20",
                compact && "lg:size-28 lg:text-4xl",
              )}
              aria-hidden
            >
              {initials(displayName)}
            </span>
          )}

          <div className={cn("min-w-0 space-y-1.5", compact && "lg:w-full")}>
            <div
              className={cn(
                "flex flex-wrap items-center gap-2",
                compact && "lg:flex-col lg:gap-1.5",
              )}
            >
              <h1 className="text-xl font-bold tracking-[-0.02em] sm:text-2xl">
                {displayName}
              </h1>
              {levelName && <Badge variant="primary">{levelName}</Badge>}
            </div>
            <div
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted",
                compact && "lg:justify-center",
              )}
            >
              {nickname && (
                <span className="font-medium text-foreground/70">@{nickname}</span>
              )}
              {city && (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="size-3.5" weight="duotone" aria-hidden />
                  {city}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Действия */}
        <div
          className={cn(
            "flex shrink-0 gap-2",
            compact && "lg:w-full lg:flex-col",
          )}
        >
          {isOwner ? (
            <Link
              href="/profile/edit"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                compact && "lg:w-full",
              )}
            >
              <PencilSimple className="size-4" weight="duotone" aria-hidden />
              Редактировать
            </Link>
          ) : (
            <ProfileActions userId={userId} compact={compact} />
          )}
        </div>
      </div>

      {/* Статистика (мероприятия/друзья/баланс) — только для волонтёра. */}
      {showStats && (
      <dl
        className={cn(
          "grid grid-cols-3 divide-x divide-border border-t border-border",
          compact &&
            "lg:grid-cols-1 lg:divide-x-0 lg:divide-y lg:divide-border",
        )}
      >
        <Stat
          icon={CalendarCheck}
          label="Мероприятия"
          value={formatTokens(stats.events ?? 0)}
          compact={compact}
        />
        <Stat
          icon={UsersThree}
          label="Друзья"
          value={formatTokens(stats.friends ?? 0)}
          compact={compact}
        />
        <Stat
          icon={Coins}
          label="Баланс"
          value={formatTokens(stats.balance)}
          compact={compact}
        />
      </dl>
      )}
    </section>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  compact,
}: {
  icon: Icon;
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "px-4 py-3.5",
        // В compact-списке метка слева, значение справа — как строка выписки.
        compact && "lg:flex lg:items-center lg:justify-between lg:gap-3",
      )}
    >
      <dt className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
        <Icon className="size-3.5" weight="duotone" aria-hidden />
        {label}
      </dt>
      <dd
        className={cn(
          "tabular mt-1 text-lg font-bold leading-none tracking-[-0.02em]",
          compact && "lg:mt-0",
        )}
      >
        {value}
      </dd>
    </div>
  );
}
