"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SignOut, CaretDown } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { BalanceChip } from "@/components/domain/balance-chip";
import { NotificationBell } from "@/components/domain/notification-bell";
import { getNavForRole, type NavItem } from "./nav-config";
import { BrandLogo } from "./brand-logo";

export interface AppShellUser {
  displayName: string;
  role: Role;
  balance: number;
}

interface AppShellProps {
  user: AppShellUser;
  children: React.ReactNode;
}

const ROLE_LABEL: Record<Role, string> = {
  VOLUNTEER: "Волонтёр",
  ORGANIZATION: "Организация",
  PARTNER: "Партнёр",
  ADMIN: "Администратор",
};

/** Активен ли пункт навигации для текущего пути. */
function isActive(pathname: string, href: string): boolean {
  if (href === "/feed" || href === "/org" || href === "/partner" || href === "/admin") {
    return pathname === href;
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ user, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const nav = React.useMemo(() => getNavForRole(user.role), [user.role]);
  const bottomNav = React.useMemo(() => nav.filter((i) => i.bottom).slice(0, 5), [nav]);

  const [menuOpen, setMenuOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      const res = await fetch("/api/auth/logout", { method: "POST" });
      if (!res.ok) throw new Error("logout failed");
      router.push("/login");
      router.refresh();
    } catch {
      setLoggingOut(false);
      toast.error("Не удалось выйти. Попробуйте ещё раз.");
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <TopBar
        user={user}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((v) => !v)}
        onLogout={handleLogout}
        loggingOut={loggingOut}
      />

      <div className="flex w-full flex-1">
        <Sidebar nav={nav} pathname={pathname} />

        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-8 md:pb-10 lg:px-10 lg:pt-8 xl:px-14">
          {children}
        </main>
      </div>

      <BottomNav nav={bottomNav} pathname={pathname} />
    </div>
  );
}

/** Заголовки групп бокового меню. */
const GROUP_LABEL: Record<NonNullable<NavItem["group"]>, string> = {
  main: "Основное",
  account: "Аккаунт",
  manage: "Управление",
};

// ─────────────────────────── TopBar ───────────────────────────

interface TopBarProps {
  user: AppShellUser;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

function TopBar({ user, menuOpen, onToggleMenu, onLogout, loggingOut }: TopBarProps) {
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onToggleMenu();
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen, onToggleMenu]);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between gap-3 px-4 md:px-6 lg:px-10 xl:px-14">
        <Link href="/feed" className="flex items-center">
          <BrandLogo descriptor />
        </Link>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Чип «кошелёк» с балансом токенов (янтарь — только фон+иконка, текст тёмный). */}
          <Link
            href="/wallet"
            aria-label="Кошелёк"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
          >
            <BalanceChip value={user.balance} />
          </Link>

          <NotificationBell />

          <span className="mx-0.5 hidden h-5 w-px bg-border sm:block" aria-hidden />

          {/* Меню пользователя */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={onToggleMenu}
              className="flex items-center gap-2 rounded-sm py-1 pl-1 pr-1.5 transition-colors hover:bg-surface-muted"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex size-7 items-center justify-center rounded-sm bg-primary-soft text-[0.8125rem] font-bold text-primary ring-1 ring-inset ring-primary/10">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">
                {user.displayName}
              </span>
              <CaretDown className="hidden size-3.5 text-muted md:inline" weight="bold" aria-hidden />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-md border border-border bg-surface shadow-md"
              >
                <div className="border-b border-border px-3.5 py-3">
                  <div className="truncate text-sm font-semibold">
                    {user.displayName}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {ROLE_LABEL[user.role]}
                  </div>
                </div>
                <Link
                  href="/profile"
                  role="menuitem"
                  className="block px-3.5 py-2.5 text-sm font-medium transition-colors hover:bg-surface-muted"
                >
                  Мой профиль
                </Link>
                <div className="border-t border-border">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={onLogout}
                    disabled={loggingOut}
                    className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm font-medium text-danger-strong transition-colors hover:bg-danger-soft disabled:opacity-50"
                  >
                    <SignOut className="size-4" weight="duotone" aria-hidden />
                    {loggingOut ? "Выходим…" : "Выйти"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────── Sidebar (≥ md) ───────────────────────────

function Sidebar({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  // Группируем пункты по смысловым блокам, сохраняя исходный порядок групп.
  const groups: { key: NonNullable<NavItem["group"]>; items: NavItem[] }[] = [];
  for (const item of nav) {
    const key = item.group ?? "main";
    const last = groups[groups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else groups.push({ key, items: [item] });
  }

  return (
    <aside className="sticky top-14 hidden h-[calc(100dvh-3.5rem)] w-60 shrink-0 border-r border-border px-3 py-5 md:block xl:w-64">
      <nav className="flex flex-col gap-5">
        {groups.map((group, gi) => (
          <div key={`${group.key}-${gi}`} className="flex flex-col gap-0.5">
            <span className="mb-1 px-2.5 text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-muted/70">
              {GROUP_LABEL[group.key]}
            </span>
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-sm font-semibold transition-colors",
                    active
                      ? "bg-primary-soft text-primary"
                      : "text-muted hover:bg-surface-muted hover:text-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                >
                  {/* Тонкий вертикальный акцент-маркер активного пункта. */}
                  {active && (
                    <span
                      className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                      aria-hidden
                    />
                  )}
                  <Icon
                    className="size-[1.125rem] shrink-0"
                    weight={active ? "fill" : "duotone"}
                    aria-hidden
                  />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

// ─────────────────────────── BottomNav (< md) ───────────────────────────

function BottomNav({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="mx-auto grid max-w-screen-xl grid-cols-5">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-1 px-1 pb-1.5 pt-2 text-[0.625rem] font-semibold tracking-[-0.01em] transition-colors",
                  active ? "text-primary" : "text-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="size-[1.375rem]"
                  weight={active ? "fill" : "duotone"}
                  aria-hidden
                />
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
