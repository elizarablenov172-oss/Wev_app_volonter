"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, LogOut, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { BalanceChip } from "@/components/domain/balance-chip";
import { getNavForRole, type NavItem } from "./nav-config";

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

      <div className="mx-auto flex w-full max-w-screen-xl flex-1">
        <Sidebar nav={nav} pathname={pathname} />

        <main className="min-w-0 flex-1 px-4 pb-24 pt-5 md:px-6 md:pb-8">
          {children}
        </main>
      </div>

      <BottomNav nav={bottomNav} pathname={pathname} />
    </div>
  );
}

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
    <header className="sticky top-0 z-30 border-b border-border bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between gap-3 px-4 md:px-6">
        <Link href="/feed" className="flex items-baseline gap-2">
          <span className="font-display text-xl font-extrabold tracking-tight text-primary">
            Евразия
          </span>
          <span className="hidden text-xs text-muted sm:inline">
            Континент возможностей
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Чип баланса токенов (янтарь — только фон+иконка, текст тёмный). */}
          <Link href="/wallet" aria-label="Кошелёк">
            <BalanceChip value={user.balance} />
          </Link>

          <button
            type="button"
            className="relative flex size-10 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
            aria-label="Уведомления"
          >
            <Bell className="size-5" aria-hidden />
          </button>

          {/* Меню пользователя */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={onToggleMenu}
              className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-surface-muted"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">
                {user.displayName.charAt(0).toUpperCase()}
              </span>
              <span className="hidden max-w-32 truncate text-sm font-semibold md:inline">
                {user.displayName}
              </span>
              <ChevronDown className="hidden size-4 text-muted md:inline" aria-hidden />
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
              >
                <div className="border-b border-border px-4 py-3">
                  <div className="truncate text-sm font-semibold">
                    {user.displayName}
                  </div>
                  <div className="text-xs text-muted">{ROLE_LABEL[user.role]}</div>
                </div>
                <Link
                  href="/profile"
                  role="menuitem"
                  className="block px-4 py-2.5 text-sm transition-colors hover:bg-surface-muted"
                >
                  Мой профиль
                </Link>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  disabled={loggingOut}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-danger-strong transition-colors hover:bg-danger-soft disabled:opacity-50"
                >
                  <LogOut className="size-4" aria-hidden />
                  {loggingOut ? "Выходим…" : "Выйти"}
                </button>
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
  return (
    <aside className="sticky top-16 hidden h-[calc(100dvh-4rem)] w-60 shrink-0 border-r border-border px-3 py-5 md:block">
      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors",
                active
                  ? "bg-primary-soft text-primary"
                  : "text-muted hover:bg-surface-muted hover:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

// ─────────────────────────── BottomNav (< md) ───────────────────────────

function BottomNav({ nav, pathname }: { nav: NavItem[]; pathname: string }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 backdrop-blur md:hidden">
      <ul className="mx-auto grid max-w-screen-xl grid-cols-5">
        {nav.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[11px] font-semibold transition-colors",
                  active ? "text-primary" : "text-muted hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-full transition-colors",
                    active && "bg-primary-soft",
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
