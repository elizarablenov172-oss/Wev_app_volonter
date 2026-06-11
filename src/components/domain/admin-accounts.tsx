"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, X, Buildings, Storefront } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Account {
  id: string;
  title: string;
  description: string | null;
  status: string;
  email: string;
}

const STATUS: Record<string, { label: string; variant: "warning" | "success" | "danger" }> = {
  PENDING: { label: "На модерации", variant: "warning" },
  APPROVED: { label: "Подтверждён", variant: "success" },
  REJECTED: { label: "Отклонён", variant: "danger" },
};

function AccountList({
  kind,
  items,
}: {
  kind: "organizations" | "partners";
  items: Account[];
}) {
  const [rows, setRows] = React.useState(items);
  const [busy, setBusy] = React.useState<string | null>(null);
  React.useEffect(() => setRows(items), [items]);

  async function moderate(id: string, action: "approve" | "reject") {
    setBusy(id);
    try {
      const res = await fetch(`/api/admin/${kind}/${id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ action }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error ?? "Ошибка");
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: d.status } : r)));
      toast.success(action === "approve" ? "Подтверждено" : "Отклонено");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(null);
    }
  }

  if (rows.length === 0) {
    return <p className="rounded-md border border-border bg-surface px-4 py-4 text-sm text-muted">Пусто.</p>;
  }

  return (
    <ul className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
      {rows.map((a) => {
        const st = STATUS[a.status] ?? STATUS.PENDING;
        return (
          <li key={a.id} className="flex flex-col gap-3 border-b border-border px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-bold">{a.title}</p>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              <p className="text-xs text-muted">{a.email}</p>
              {a.description && <p className="mt-0.5 line-clamp-1 text-sm text-muted">{a.description}</p>}
            </div>
            {a.status === "PENDING" && (
              <div className="flex shrink-0 gap-2">
                <Button size="sm" variant="success" disabled={busy === a.id} onClick={() => moderate(a.id, "approve")}>
                  <Check className="size-4" weight="bold" aria-hidden />
                  Подтвердить
                </Button>
                <Button size="sm" variant="secondary" disabled={busy === a.id} onClick={() => moderate(a.id, "reject")}>
                  <X className="size-4" weight="bold" aria-hidden />
                  Отклонить
                </Button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function AdminAccounts({
  organizations,
  partners,
}: {
  organizations: Account[];
  partners: Account[];
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold tracking-[-0.01em]">
          <Buildings className="size-4 text-primary" weight="duotone" aria-hidden />
          Организации
        </h2>
        <AccountList kind="organizations" items={organizations} />
      </section>
      <section className="space-y-2">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold tracking-[-0.01em]">
          <Storefront className="size-4 text-primary" weight="duotone" aria-hidden />
          Партнёры
        </h2>
        <AccountList kind="partners" items={partners} />
      </section>
    </div>
  );
}
