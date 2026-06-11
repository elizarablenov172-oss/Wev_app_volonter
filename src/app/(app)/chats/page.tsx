"use client";

import * as React from "react";
import Link from "next/link";
import { ChatCircle, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { Skeleton } from "@/components/ui/skeleton";

interface DialogItem {
  id: string;
  user: { id: string; displayName: string; nickname: string | null; avatarUrl: string | null };
  unread: number;
  lastMessage: { text: string; createdAt: string; mine: boolean } | null;
  lastAt: string;
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" });

export default function ChatsPage() {
  const [items, setItems] = React.useState<DialogItem[] | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/dialogs", { credentials: "same-origin" });
        const d = await r.json();
        if (alive) setItems(d.items ?? []);
      } catch {
        if (alive) setItems([]);
      }
    };
    load();
    const t = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Чаты" description="Переписка с друзьями." />

      {items === null ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={ChatCircle}
          title="Нет диалогов"
          description="Добавьте друзей и начните переписку из раздела «Друзья»."
        />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
          {items.map((d) => (
            <li key={d.id}>
              <Link
                href={`/chats/${d.id}`}
                className="flex items-center gap-3 border-b border-border px-4 py-3 transition-colors last:border-b-0 hover:bg-surface-muted"
              >
                {d.user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.user.avatarUrl} alt="" className="size-11 shrink-0 rounded-md border border-border object-cover" />
                ) : (
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-on-primary" aria-hidden>
                    {d.user.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold">{d.user.displayName}</p>
                    <span className="shrink-0 text-xs text-muted">{timeFmt.format(new Date(d.lastAt))}</span>
                  </div>
                  <p className="truncate text-sm text-muted">
                    {d.lastMessage ? (d.lastMessage.mine ? `Вы: ${d.lastMessage.text}` : d.lastMessage.text) : "Нет сообщений"}
                  </p>
                </div>
                {d.unread > 0 ? (
                  <span className="tabular flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-bold text-on-primary">
                    {d.unread}
                  </span>
                ) : (
                  <CaretRight className="size-4 shrink-0 text-muted" weight="bold" aria-hidden />
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
