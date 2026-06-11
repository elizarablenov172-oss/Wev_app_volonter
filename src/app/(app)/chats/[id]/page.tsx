"use client";

import * as React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { CaretLeft, PaperPlaneRight, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Msg {
  id: string;
  text: string;
  mine: boolean;
  readAt: string | null;
  createdAt: string;
}
interface UserCard {
  id: string;
  displayName: string;
  nickname: string | null;
  avatarUrl: string | null;
}

const timeFmt = new Intl.DateTimeFormat("ru-RU", { hour: "2-digit", minute: "2-digit" });

export default function ChatConversationPage() {
  const params = useParams<{ id: string }>();
  const dialogId = params.id;

  const [user, setUser] = React.useState<UserCard | null>(null);
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [text, setText] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [loaded, setLoaded] = React.useState(false);
  const [notFound, setNotFound] = React.useState(false);
  const bottomRef = React.useRef<HTMLDivElement>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await fetch(`/api/dialogs/${dialogId}/messages`, { credentials: "same-origin" });
      if (r.status === 403 || r.status === 404) {
        setNotFound(true);
        return;
      }
      const d = await r.json();
      setUser(d.user);
      setMessages(d.messages ?? []);
    } catch {
      /* тихо */
    } finally {
      setLoaded(true);
    }
  }, [dialogId]);

  React.useEffect(() => {
    load();
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [load]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/dialogs/${dialogId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ text: value }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Не удалось отправить");
      setMessages((prev) => [...prev, d.message]);
      setText("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  if (notFound) {
    return (
      <div className="mx-auto max-w-2xl py-10 text-center">
        <p className="text-sm text-muted">Диалог недоступен.</p>
        <Link href="/chats" className="mt-3 inline-block text-sm font-semibold text-primary hover:underline">
          ← К чатам
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-8.5rem)] max-w-3xl flex-col md:h-[calc(100dvh-7rem)]">
      {/* Шапка диалога */}
      <div className="flex items-center gap-3 border-b border-border pb-3">
        <Link href="/chats" className="rounded-sm p-1 text-muted hover:bg-surface-muted hover:text-foreground" aria-label="К чатам">
          <CaretLeft className="size-5" weight="bold" aria-hidden />
        </Link>
        {user &&
          (user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatarUrl} alt="" className="size-9 rounded-md border border-border object-cover" />
          ) : (
            <span className="flex size-9 items-center justify-center rounded-md bg-primary text-sm font-bold text-on-primary" aria-hidden>
              {user.displayName.charAt(0).toUpperCase()}
            </span>
          ))}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{user?.displayName ?? "…"}</p>
          {user?.nickname && <p className="truncate text-xs text-muted">@{user.nickname}</p>}
        </div>
      </div>

      {/* Лента сообщений */}
      <div className="flex-1 space-y-2 overflow-y-auto py-4">
        {!loaded ? (
          <p className="text-center text-sm text-muted">Загрузка…</p>
        ) : messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Начните переписку — напишите первое сообщение.</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={cn("flex", m.mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[78%] rounded-lg px-3 py-2 text-sm shadow-xs",
                  m.mine
                    ? "rounded-br-sm bg-primary text-on-primary"
                    : "rounded-bl-sm border border-border bg-surface text-foreground",
                )}
              >
                <p className="whitespace-pre-wrap break-words">{m.text}</p>
                <p className={cn("mt-1 text-right text-[0.625rem]", m.mine ? "text-on-primary/70" : "text-muted")}>
                  {timeFmt.format(new Date(m.createdAt))}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Композер */}
      <form onSubmit={send} className="flex items-end gap-2 border-t border-border pt-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e);
            }
          }}
          rows={1}
          placeholder="Сообщение…"
          className="max-h-32 min-h-[2.75rem] flex-1 resize-none rounded-sm border border-border bg-surface px-3 py-2.5 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        />
        <Button type="submit" size="lg" disabled={sending || !text.trim()} aria-label="Отправить">
          {sending ? <CircleNotch className="size-5 animate-spin" weight="bold" aria-hidden /> : <PaperPlaneRight className="size-5" weight="fill" aria-hidden />}
        </Button>
      </form>
    </div>
  );
}
