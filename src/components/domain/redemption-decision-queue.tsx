"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coins,
  Storefront,
  SealCheck,
  XCircle,
  CircleNotch,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { RewardTypeBadge } from "@/components/domain/reward-type-badge";
import { EmptyState } from "@/components/domain/empty-state";
import {
  formatRewardDateTime,
  userDisplay,
  type PendingRedemptionItem,
} from "@/lib/rewards";

/** Очередь решений админа по заявкам на крупные награды (одобрить/отклонить). */
export function RedemptionDecisionQueue({
  initialItems,
}: {
  initialItems: PendingRedemptionItem[];
}) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [reason, setReason] = React.useState("");

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/redemptions/${id}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action,
          reason: action === "reject" ? reason.trim() || undefined : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось применить решение");
      toast.success(
        action === "approve"
          ? "Заявка одобрена — код выдан"
          : "Заявка отклонена — токены возвращены",
      );
      setItems((prev) => prev.filter((x) => x.id !== id));
      setRejecting(null);
      setReason("");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusyId(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={SealCheck}
        title="Очередь пуста"
        description="Нет заявок на крупные награды, ожидающих решения."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      {items.map((it) => {
        const busy = busyId === it.id;
        return (
          <li key={it.id} className="flex flex-col rounded-md border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <RewardTypeBadge type={it.reward.type} />
                <h3 className="mt-2 text-base font-bold tracking-[-0.02em]">
                  {it.reward.title}
                </h3>
                {it.reward.partner && (
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-muted">
                    <Storefront className="size-3.5" weight="duotone" aria-hidden />
                    {it.reward.partner.brandName}
                  </p>
                )}
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 text-sm font-bold text-warning-strong">
                <Coins className="size-4 text-tokens" weight="duotone" aria-hidden />
                {it.costTokens}
              </span>
            </div>

            <dl className="mt-3 space-y-1 border-t border-border pt-3 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Заявитель</dt>
                <dd className="truncate font-semibold">{userDisplay(it.user)}</dd>
              </div>
              {it.user.city && (
                <div className="flex justify-between gap-2">
                  <dt className="text-muted">Город</dt>
                  <dd>{it.user.city}</dd>
                </div>
              )}
              <div className="flex justify-between gap-2">
                <dt className="text-muted">Создана</dt>
                <dd>{formatRewardDateTime(it.purchasedAt)}</dd>
              </div>
            </dl>

            <div className="mt-auto pt-4">
              {rejecting === it.id ? (
                <div className="space-y-2">
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={2}
                    maxLength={500}
                    placeholder="Причина отклонения (необязательно)"
                    className="w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
                  />
                  <div className="flex gap-2">
                    <Button variant="danger" size="sm" disabled={busy} onClick={() => decide(it.id, "reject")}>
                      {busy && <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />}
                      Подтвердить отклонение
                    </Button>
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setRejecting(null); setReason(""); }}>
                      Назад
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="success" size="sm" className="flex-1" disabled={busy} onClick={() => decide(it.id, "approve")}>
                    {busy ? (
                      <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
                    ) : (
                      <SealCheck className="size-4" weight="duotone" aria-hidden />
                    )}
                    Одобрить
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => { setRejecting(it.id); setReason(""); }}>
                    <XCircle className="size-4" weight="duotone" aria-hidden />
                    Отклонить
                  </Button>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
