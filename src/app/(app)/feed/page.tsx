import Link from "next/link";
import {
  Coins,
  CalendarCheck,
  ListChecks,
  Storefront,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { formatTokens } from "@/lib/utils";
import { BalanceChip } from "@/components/domain/balance-chip";
import { ActivityFeed } from "@/components/domain/activity-feed";

const QUICK_LINKS = [
  { href: "/events", label: "Мероприятия", icon: CalendarCheck },
  { href: "/missions", label: "Задания", icon: ListChecks },
  { href: "/marketplace", label: "Маркетплейс", icon: Storefront },
  { href: "/profile", label: "Мой профиль", icon: UserCircle },
] as const;

export default async function FeedPage() {
  const user = await requireUser();

  return (
    // ПК (≥lg): основная лента + правый рейл. Телефон (<lg): только лента.
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start lg:gap-6">
      {/* Основная колонка — лента активности */}
      <div className="min-w-0 space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              С возвращением
            </p>
            <h1 className="truncate text-2xl font-bold tracking-[-0.02em]">
              {user.displayName}
            </h1>
          </div>
          {/* Баланс в шапке — только на мобиле/планшете (на ПК он в рейле). */}
          <BalanceChip
            value={user.cachedBalance}
            size="lg"
            className="shrink-0 lg:hidden"
          />
        </div>

        <div className="space-y-3">
          <h2 className="sticky top-14 z-10 -mx-4 border-b border-border bg-background/90 px-4 py-2.5 text-sm font-bold tracking-[-0.01em] backdrop-blur-sm md:mx-0 md:rounded-sm md:border md:px-3">
            Лента активности
          </h2>
          <ActivityFeed userId={user.id} isOwner />
        </div>
      </div>

      {/* Правый рейл — только ПК (≥lg) */}
      <aside className="hidden space-y-4 lg:sticky lg:top-20 lg:block">
        {/* Баланс */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              Баланс
            </span>
            <Coins className="size-4 text-tokens" weight="duotone" aria-hidden />
          </div>
          <div className="flex items-baseline gap-1.5 px-4 py-4">
            <span className="tabular text-3xl font-extrabold tracking-[-0.02em]">
              {formatTokens(user.cachedBalance)}
            </span>
            <span className="text-sm font-semibold text-muted">токенов</span>
          </div>
          <Link
            href="/wallet"
            className="block border-t border-border px-4 py-2.5 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft/50"
          >
            История операций →
          </Link>
        </section>

        {/* Быстрые действия */}
        <nav className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
          <span className="block border-b border-border px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
            Быстрый доступ
          </span>
          <ul className="divide-y divide-border">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-surface-muted"
                >
                  <Icon
                    className="size-[1.125rem] text-muted"
                    weight="duotone"
                    aria-hidden
                  />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </div>
  );
}
