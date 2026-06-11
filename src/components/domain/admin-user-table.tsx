"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TokenAmount } from "@/components/domain/token-amount";

interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  nickname: string | null;
  role: string;
  isBlocked: boolean;
  cachedBalance: number;
}

const ROLE_LABEL: Record<string, string> = {
  VOLUNTEER: "Волонтёр",
  ORGANIZATION: "Организация",
  PARTNER: "Партнёр",
  ADMIN: "Админ",
};

export function AdminUserTable({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = React.useState(initialUsers);
  const [busy, setBusy] = React.useState<string | null>(null);

  React.useEffect(() => setUsers(initialUsers), [initialUsers]);

  async function toggleBlock(u: AdminUser) {
    setBusy(u.id);
    try {
      const res = await fetch(`/api/admin/users/${u.id}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ blocked: !u.isBlocked }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Ошибка");
      setUsers((prev) => prev.map((x) => (x.id === u.id ? { ...x, isBlocked: !u.isBlocked } : x)));
      toast.success(!u.isBlocked ? "Пользователь заблокирован" : "Пользователь разблокирован");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  if (users.length === 0) {
    return <p className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-muted">Никого не найдено.</p>;
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      {/* Десктоп: таблица; мобайл: карточки */}
      <table className="hidden w-full text-sm md:table">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-[0.04em] text-muted">
            <th className="px-4 py-2.5 font-semibold">Пользователь</th>
            <th className="px-4 py-2.5 font-semibold">Роль</th>
            <th className="px-4 py-2.5 text-right font-semibold">Баланс</th>
            <th className="px-4 py-2.5 font-semibold">Статус</th>
            <th className="px-4 py-2.5 text-right font-semibold">Действие</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border last:border-b-0">
              <td className="px-4 py-2.5">
                <Link href={`/profile/${u.id}`} className="font-semibold hover:text-primary">{u.displayName}</Link>
                <div className="text-xs text-muted">{u.email}</div>
              </td>
              <td className="px-4 py-2.5 text-muted">{ROLE_LABEL[u.role] ?? u.role}</td>
              <td className="px-4 py-2.5 text-right"><TokenAmount value={u.cachedBalance} sign="neutral" /></td>
              <td className="px-4 py-2.5">
                {u.isBlocked ? <Badge variant="danger">Заблокирован</Badge> : <Badge variant="success">Активен</Badge>}
              </td>
              <td className="px-4 py-2.5 text-right">
                {u.role !== "ADMIN" && (
                  <Button size="sm" variant={u.isBlocked ? "secondary" : "danger"} disabled={busy === u.id} onClick={() => toggleBlock(u)}>
                    {u.isBlocked ? "Разблокировать" : "Заблокировать"}
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="divide-y divide-border md:hidden">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <Link href={`/profile/${u.id}`} className="block truncate font-semibold">{u.displayName}</Link>
              <div className="truncate text-xs text-muted">{ROLE_LABEL[u.role] ?? u.role} · {u.email}</div>
              <div className="mt-1">{u.isBlocked ? <Badge variant="danger">Заблокирован</Badge> : <Badge variant="success">Активен</Badge>}</div>
            </div>
            {u.role !== "ADMIN" && (
              <Button size="sm" variant={u.isBlocked ? "secondary" : "danger"} disabled={busy === u.id} onClick={() => toggleBlock(u)}>
                {u.isBlocked ? "Разблок." : "Блок"}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
