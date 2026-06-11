"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CircleNotch,
  SealCheck,
  HourglassMedium,
  UploadSimple,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MissionStatusBadge } from "@/components/domain/mission-status-badge";
import {
  PROOF_METHOD_META,
  type MissionStatus,
  type ProofMethod,
} from "@/lib/missions";

interface MissionActionPanelProps {
  missionId: string;
  proofMethod: ProofMethod;
  rewardTokens: number;
  isVolunteer: boolean;
  isAuthenticated: boolean;
  initialStatus: MissionStatus;
  moderatorNote?: string | null;
}

const TEXTAREA_CLASS =
  "flex w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-xs placeholder:text-muted/80 hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

export function MissionActionPanel({
  missionId,
  proofMethod,
  rewardTokens,
  isVolunteer,
  isAuthenticated,
  initialStatus,
  moderatorNote,
}: MissionActionPanelProps) {
  const router = useRouter();
  const [status, setStatus] = React.useState<MissionStatus>(initialStatus);
  const [busy, setBusy] = React.useState(false);

  // Поля сдачи пруфа.
  const [file, setFile] = React.useState<File | null>(null);
  const [link, setLink] = React.useState("");
  const [code, setCode] = React.useState("");
  const [note, setNote] = React.useState("");

  async function accept() {
    setBusy(true);
    try {
      const res = await fetch(`/api/missions/${missionId}/start`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось взять задание");
      setStatus("ACCEPTED");
      toast.success("Задание взято в работу");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function submitProof() {
    setBusy(true);
    try {
      let res: Response;
      if (proofMethod === "SCREENSHOT") {
        if (!file) {
          toast.error("Прикрепите скриншот");
          setBusy(false);
          return;
        }
        const fd = new FormData();
        fd.append("file", file);
        if (note.trim()) fd.append("note", note.trim());
        res = await fetch(`/api/missions/${missionId}/submit-proof`, {
          method: "POST",
          credentials: "same-origin",
          body: fd,
        });
      } else {
        const body: Record<string, string> = {};
        if (link.trim()) body.url = link.trim();
        if (code.trim()) body.code = code.trim();
        if (note.trim()) body.note = note.trim();
        res = await fetch(`/api/missions/${missionId}/submit-proof`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify(body),
        });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось отправить подтверждение");
      setStatus("PENDING_REVIEW");
      toast.success("Подтверждение отправлено на проверку");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  if (!isAuthenticated) {
    return (
      <p className="rounded-sm bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-muted">
        Войдите, чтобы выполнять задания.
      </p>
    );
  }
  if (!isVolunteer) {
    return (
      <p className="rounded-sm bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-muted">
        Выполнять задания может только волонтёр.
      </p>
    );
  }

  // Статусные состояния.
  if (status === "PENDING_REVIEW") {
    return (
      <div className="rounded-md bg-warning-soft px-4 py-3 ring-1 ring-inset ring-warning-strong/15">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-warning-strong">
          <HourglassMedium className="size-5" weight="duotone" aria-hidden />
          На проверке
        </p>
        <p className="mt-1 text-xs text-warning-strong/90">
          Модератор проверит подтверждение и начислит {rewardTokens} токенов.
        </p>
      </div>
    );
  }
  if (status === "COMPLETED") {
    return (
      <div className="rounded-md bg-success-soft px-4 py-3 ring-1 ring-inset ring-success-strong/15">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-success-strong">
          <SealCheck className="size-5" weight="fill" aria-hidden />
          Задание выполнено · +{rewardTokens} токенов
        </p>
      </div>
    );
  }

  const canSubmit = status === "ACCEPTED" || status === "REJECTED";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-muted">Статус</span>
        <MissionStatusBadge status={status} />
      </div>

      <div className="rounded-md bg-warning-soft px-4 py-3 ring-1 ring-inset ring-warning-strong/15">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-warning-strong">
          Награда
        </p>
        <p className="tabular mt-0.5 text-2xl font-extrabold tracking-[-0.02em] text-warning-strong">
          {rewardTokens} токенов
        </p>
      </div>

      {status === "REJECTED" && moderatorNote && (
        <p className="flex items-start gap-2 rounded-sm bg-danger-soft px-3 py-2 text-xs text-danger-strong">
          <WarningCircle className="mt-0.5 size-4 shrink-0" weight="duotone" aria-hidden />
          <span>Отклонено: {moderatorNote}. Можно отправить заново.</span>
        </p>
      )}

      {!canSubmit ? (
        <Button className="w-full" size="lg" onClick={accept} disabled={busy}>
          {busy && <CircleNotch className="size-5 animate-spin" weight="bold" aria-hidden />}
          Взять задание
        </Button>
      ) : (
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
            Подтверждение · {PROOF_METHOD_META[proofMethod]}
          </p>

          {proofMethod === "SCREENSHOT" ? (
            <div>
              <Label htmlFor="proof-file">Скриншот выполнения</Label>
              <input
                id="proof-file"
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-muted file:mr-3 file:rounded-sm file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-semibold file:text-on-primary hover:file:bg-primary-hover"
              />
            </div>
          ) : (
            <div className="space-y-3">
              {(proofMethod === "UTM_LINK" || proofMethod === "OAUTH") && (
                <div>
                  <Label htmlFor="proof-link">Ссылка-подтверждение</Label>
                  <Input
                    id="proof-link"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://…"
                    inputMode="url"
                  />
                </div>
              )}
              {proofMethod === "PROMO_QR" && (
                <div>
                  <Label htmlFor="proof-code">Промокод</Label>
                  <Input
                    id="proof-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Введите код"
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="proof-note">Комментарий (необязательно)</Label>
            <textarea
              id="proof-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              maxLength={1000}
              className={TEXTAREA_CLASS}
              placeholder="Что вы сделали"
            />
          </div>

          <Button className="w-full" size="lg" onClick={submitProof} disabled={busy}>
            {busy ? (
              <CircleNotch className="size-5 animate-spin" weight="bold" aria-hidden />
            ) : (
              <UploadSimple className="size-5" weight="bold" aria-hidden />
            )}
            Отправить на проверку
          </Button>
        </div>
      )}
    </div>
  );
}
