"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BellSimple } from "@phosphor-icons/react/dist/ssr";

/**
 * Колокол уведомлений в TopBar: показывает счётчик непрочитанных,
 * опрашивает API раз в 30 с и при смене маршрута.
 */
export function NotificationBell() {
  const pathname = usePathname();
  const [count, setCount] = React.useState(0);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/notifications", { credentials: "same-origin" });
      if (!res.ok) return;
      const data = await res.json();
      setCount(data.unreadCount ?? 0);
    } catch {
      /* тихо игнорируем */
    }
  }, []);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load, pathname]);

  return (
    <Link
      href="/notifications"
      aria-label={`Уведомления${count ? `, непрочитанных: ${count}` : ""}`}
      className="relative flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
    >
      <BellSimple className="size-[1.125rem]" weight="duotone" aria-hidden />
      {count > 0 && (
        <span className="tabular absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.625rem] font-bold leading-none text-white">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
