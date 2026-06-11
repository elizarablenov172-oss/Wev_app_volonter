"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Coins,
  SealCheck,
  XCircle,
  CircleNotch,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/domain/empty-state";
import { formatMissionDate, userDisplay } from "@/lib/missions";

interface PendingSubmission {
  id: string;
  proofUrl: string | null;
  proofData: unknown;
  createdAt: string;
  mission: {
    id: string;
    title: string;
    rewardTokens: number;
    instruction: string | null;
    targetUrl: string | null;
  };
  user: { id: string; displayName: string; nickname: string | null; city: string | null };
}

function proofText(data: unknown): { url?: string; code?: string; note?: string } {
  if (data && typeof data === "object") return data as Record<string, string>;
  return {};
}

export function MissionReviewQueue({ initialItems }: { initialItems: PendingSubmission[] }) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");

  async function decide(id: string, action: "approve" | "reject") {
    setBusyId(id);
    try {
      const res = await fetch(`/api/admin/missions/submissions/${id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          action,
          note: action === "reject" ? note.trim() || undefined : undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось применить решение");
      toast.success(
        action === "approve" ? "Задание принято — токены начислены" : "Задание отклонено",
      );
      setItems((prev) => prev.filter((x) => x.id !== id));
      setRejecting(null);
      setNote("");
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
        description="Нет подтверждений заданий, ожидающих проверки."
      />
    );
  }

  return (
    <ul className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {items.map((it) => {
        const busy = busyId === it.id;
        const p = proofText(it.proofData);
        return (
          <li key={it.id} className="flex flex-col rounded-md border border-border bg-surface p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-bold tracking-[-0.02em]">{it.mission.title}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {userDisplay(it.user)}
                  {it.user.city ? ` · ${it.user.city}` : ""} · {formatMissionDate(it.createdAt)}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 text-sm font-bold text-warning-strong">
                <Coins className="size-4 text-tokens" weight="duotone" aria-hidden />
                {it.mission.rewardTokens}
              </span>
            </div>

            {/* Пруф */}
            <div className="mt-3 space-y-2 border-t border-border pt-3">
              {it.proofUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <a href={it.proofUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={it.proofUrl}
                    alt="Скриншот-подтверждение"
                    className="max-h-48 w-full rounded-sm border border-border object-cover"
                  />
                </a>
              )}
              {p.url && (
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 break-all text-sm font-semibold text-primary hover:underline"
                >
                  <LinkSimple className="size-4 shrink-0" weight="duotone" aria-hidden />
                  {p.url}
                </a>
              )}
              {p.code && (
                <p className="text-sm">
                  Код: <span className="tabular font-bold">{p.code}</span>
                </p>
              )}
              {p.note && <p className="text-sm text-muted">{p.note}</p>}
              {!it.proofUrl && !p.url && !p.code && !p.note && (
                <p className="text-sm text-muted">Без вложений</p>
              )}
            </div>

            <div className="mt-auto pt-4">
              {rejecting === it.id ? (
                <div className="space-y-2">
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
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
                    <Button variant="secondary" size="sm" disabled={busy} onClick={() => { setRejecting(null); setNote(""); }}>
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
                    Принять
                  </Button>
                  <Button variant="secondary" size="sm" className="flex-1" disabled={busy} onClick={() => { setRejecting(it.id); setNote(""); }}>
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
