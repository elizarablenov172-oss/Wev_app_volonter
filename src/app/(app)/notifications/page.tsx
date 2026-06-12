"use client";

import * as React from "react";
import { BellSimple, Checks } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
}

const fmt = new Intl.DateTimeFormat("ru-RU", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

export default function NotificationsPage() {
  const [items, setItems] = React.useState<Notif[] | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" });
      const d = await r.json();
      setItems(d.items ?? []);
    } catch {
      setItems([]);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function markAll() {
    setBusy(true);
    await fetch("/api/notifications/read", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: "{}",
    });
    setItems((p) => (p ? p.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) : p));
    setBusy(false);
  }

  const hasUnread = items?.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Уведомления"
        actions={
          hasUnread ? (
            <Button variant="secondary" size="sm" onClick={markAll} disabled={busy}>
              <Checks className="size-4" weight="bold" aria-hidden />
              Прочитать все
            </Button>
          ) : undefined
        }
      />

      {items === null ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-md" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={BellSimple}
          title="Пока нет уведомлений"
          description="Здесь появятся начисления токенов, заявки в друзья и сообщения."
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
          {items.map((n) => (
            <li
              key={n.id}
              className={cn(
                "flex gap-3 border-b border-border px-4 py-3 last:border-b-0",
                !n.readAt && "bg-primary-soft/40",
              )}
            >
              <span
                className={cn(
                  "mt-1.5 size-2 shrink-0 rounded-full",
                  n.readAt ? "bg-transparent" : "bg-primary",
                )}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{n.title}</p>
                {n.body && <p className="mt-0.5 text-sm text-muted">{n.body}</p>}
                <p className="mt-1 text-xs text-muted">{fmt.format(new Date(n.createdAt))}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
