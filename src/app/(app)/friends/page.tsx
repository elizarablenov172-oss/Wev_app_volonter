"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UsersThree,
  UserPlus,
  ChatCircle,
  MagnifyingGlass,
  Check,
  X,
  MapPin,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/domain/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface UserCard {
  id: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
  city: string | null;
}
interface FriendsData {
  friends: { friendshipId: string; user: UserCard }[];
  incoming: { friendshipId: string; user: UserCard }[];
  outgoing: { friendshipId: string; user: UserCard }[];
}
interface SearchRow {
  user: UserCard;
  relation: "none" | "friends" | "incoming" | "outgoing";
  friendshipId: string | null;
}

type Tab = "friends" | "requests" | "search";

function Avatar({ user }: { user: UserCard }) {
  if (user.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.avatarUrl} alt="" className="size-11 shrink-0 rounded-md border border-border object-cover" />;
  }
  return (
    <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-base font-bold text-on-primary" aria-hidden>
      {user.displayName.charAt(0).toUpperCase()}
    </span>
  );
}

function UserRow({ user, children }: { user: UserCard; children?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0">
      <Link href={`/profile/${user.id}`} className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar user={user} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user.displayName}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-muted">
            {user.nickname && <span>@{user.nickname}</span>}
            {user.city && (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3" weight="duotone" aria-hidden />
                {user.city}
              </span>
            )}
          </p>
        </div>
      </Link>
      <div className="flex shrink-0 gap-2">{children}</div>
    </li>
  );
}

export default function FriendsPage() {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("friends");
  const [data, setData] = React.useState<FriendsData | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<SearchRow[] | null>(null);

  const load = React.useCallback(async () => {
    const r = await fetch("/api/friends", { credentials: "same-origin" });
    setData(await r.json());
  }, []);
  React.useEffect(() => {
    load();
  }, [load]);

  async function act(url: string, method: string, okMsg: string) {
    setBusy(url);
    try {
      const res = await fetch(url, { method, credentials: "same-origin" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Ошибка");
      toast.success(okMsg);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function addFriend(userId: string) {
    setBusy(userId);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Ошибка");
      toast.success("Заявка отправлена");
      await Promise.all([load(), runSearch(query)]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  async function openChat(userId: string) {
    setBusy(userId);
    try {
      const res = await fetch("/api/dialogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Ошибка");
      router.push(`/chats/${d.dialogId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      setBusy(null);
    }
  }

  const runSearch = React.useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults(null);
      return;
    }
    const r = await fetch(`/api/users/search?q=${encodeURIComponent(q)}`, { credentials: "same-origin" });
    const d = await r.json();
    setResults(d.items ?? []);
  }, []);

  React.useEffect(() => {
    const t = setTimeout(() => runSearch(query), 350);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const incomingCount = data?.incoming.length ?? 0;
  const tabs: { key: Tab; label: string; badge?: number }[] = [
    { key: "friends", label: "Друзья" },
    { key: "requests", label: "Заявки", badge: incomingCount },
    { key: "search", label: "Поиск" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Друзья" description="Находите участников, добавляйте в друзья и общайтесь." />

      {/* Табы */}
      <div className="flex gap-1 rounded-md border border-border bg-surface p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-sm px-3 py-2 text-sm font-semibold transition-colors",
              tab === t.key ? "bg-primary-soft text-primary" : "text-muted hover:text-foreground",
            )}
          >
            {t.label}
            {t.badge ? (
              <span className="tabular flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] font-bold text-on-primary">
                {t.badge}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {!data ? (
        <Skeleton className="h-40 w-full rounded-lg" />
      ) : tab === "friends" ? (
        data.friends.length === 0 ? (
          <EmptyState icon={UsersThree} title="Пока нет друзей" description="Найдите участников во вкладке «Поиск»." />
        ) : (
          <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
            {data.friends.map(({ friendshipId, user }) => (
              <UserRow key={friendshipId} user={user}>
                <Button size="sm" onClick={() => openChat(user.id)} disabled={busy === user.id}>
                  <ChatCircle className="size-4" weight="duotone" aria-hidden />
                  Написать
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => act(`/api/friends/${friendshipId}`, "DELETE", "Удалён из друзей")}
                  disabled={busy === `/api/friends/${friendshipId}`}
                >
                  Удалить
                </Button>
              </UserRow>
            ))}
          </ul>
        )
      ) : tab === "requests" ? (
        <div className="space-y-5">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">Входящие</h2>
            {data.incoming.length === 0 ? (
              <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">Нет входящих заявок</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
                {data.incoming.map(({ friendshipId, user }) => (
                  <UserRow key={friendshipId} user={user}>
                    <Button size="sm" variant="success" onClick={() => act(`/api/friends/${friendshipId}/accept`, "POST", "Заявка принята")} disabled={busy?.includes(friendshipId)}>
                      <Check className="size-4" weight="bold" aria-hidden />
                      Принять
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => act(`/api/friends/${friendshipId}/decline`, "POST", "Заявка отклонена")} disabled={busy?.includes(friendshipId)}>
                      <X className="size-4" weight="bold" aria-hidden />
                    </Button>
                  </UserRow>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">Исходящие</h2>
            {data.outgoing.length === 0 ? (
              <p className="rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted">Нет исходящих заявок</p>
            ) : (
              <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
                {data.outgoing.map(({ friendshipId, user }) => (
                  <UserRow key={friendshipId} user={user}>
                    <Button size="sm" variant="secondary" onClick={() => act(`/api/friends/${friendshipId}`, "DELETE", "Заявка отменена")} disabled={busy === `/api/friends/${friendshipId}`}>
                      Отменить
                    </Button>
                  </UserRow>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" weight="duotone" aria-hidden />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Имя или никнейм (от 2 символов)"
              className="pl-9"
            />
          </div>
          {results === null ? (
            <p className="px-1 text-sm text-muted">Введите имя для поиска.</p>
          ) : results.length === 0 ? (
            <EmptyState icon={MagnifyingGlass} title="Никого не нашли" description="Попробуйте другой запрос." />
          ) : (
            <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
              {results.map(({ user, relation }) => (
                <UserRow key={user.id} user={user}>
                  {relation === "none" && (
                    <Button size="sm" onClick={() => addFriend(user.id)} disabled={busy === user.id}>
                      <UserPlus className="size-4" weight="duotone" aria-hidden />
                      Добавить
                    </Button>
                  )}
                  {relation === "outgoing" && <span className="text-xs font-medium text-muted">Заявка отправлена</span>}
                  {relation === "incoming" && (
                    <Button size="sm" onClick={() => addFriend(user.id)} disabled={busy === user.id}>
                      <Check className="size-4" weight="bold" aria-hidden />
                      Принять
                    </Button>
                  )}
                  {relation === "friends" && (
                    <Button size="sm" variant="secondary" onClick={() => openChat(user.id)} disabled={busy === user.id}>
                      <ChatCircle className="size-4" weight="duotone" aria-hidden />
                      Написать
                    </Button>
                  )}
                </UserRow>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
