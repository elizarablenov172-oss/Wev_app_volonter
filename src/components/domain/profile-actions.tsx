"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, ChatCircle, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Действия в чужом профиле: «Добавить в друзья» и «Написать».
 * «Написать» создаёт/открывает диалог. Для админа диалог создаётся с любым
 * пользователем (бэкенд снимает требование дружбы по роли ADMIN).
 */
export function ProfileActions({
  userId,
  compact,
}: {
  userId: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = React.useState(false);
  const [writing, setWriting] = React.useState(false);

  async function addFriend() {
    setAdding(true);
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Не удалось отправить заявку");
      toast.success("Заявка в друзья отправлена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setAdding(false);
    }
  }

  async function write() {
    setWriting(true);
    try {
      const res = await fetch("/api/dialogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ userId }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Не удалось открыть чат");
      router.push(`/chats/${d.dialogId}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
      setWriting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={addFriend}
        disabled={adding}
        className={cn(buttonVariants({ variant: "primary", size: "sm" }), compact && "lg:w-full")}
      >
        {adding ? (
          <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
        ) : (
          <UserPlus className="size-4" weight="duotone" aria-hidden />
        )}
        Добавить
      </button>
      <button
        type="button"
        onClick={write}
        disabled={writing}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), compact && "lg:w-full")}
      >
        {writing ? (
          <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
        ) : (
          <ChatCircle className="size-4" weight="duotone" aria-hidden />
        )}
        Написать
      </button>
    </>
  );
}
