"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  PROOF_METHOD_VALUES,
  PROOF_METHOD_META,
  type ProofMethod,
} from "@/lib/missions";

export interface MissionFormInitial {
  title: string;
  description: string;
  targetUrl: string;
  instruction: string;
  rewardTokens: string;
  deadlineLocal: string;
  audience: string;
  proofMethod: ProofMethod;
  isActive: boolean;
}

interface MissionFormProps {
  mode: "create" | "edit";
  missionId?: string;
  initial?: Partial<MissionFormInitial>;
}

const EMPTY: MissionFormInitial = {
  title: "",
  description: "",
  targetUrl: "",
  instruction: "",
  rewardTokens: "20",
  deadlineLocal: "",
  audience: "",
  proofMethod: "SCREENSHOT",
  isActive: true,
};

const TEXTAREA_CLASS =
  "flex w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-xs placeholder:text-muted/80 hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";
const SELECT_CLASS =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-xs hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

export function MissionForm({ mode, missionId, initial }: MissionFormProps) {
  const router = useRouter();
  const s = { ...EMPTY, ...initial };

  const [title, setTitle] = React.useState(s.title);
  const [description, setDescription] = React.useState(s.description);
  const [targetUrl, setTargetUrl] = React.useState(s.targetUrl);
  const [instruction, setInstruction] = React.useState(s.instruction);
  const [rewardTokens, setRewardTokens] = React.useState(s.rewardTokens);
  const [deadlineLocal, setDeadlineLocal] = React.useState(s.deadlineLocal);
  const [audience, setAudience] = React.useState(s.audience);
  const [proofMethod, setProofMethod] = React.useState<ProofMethod>(s.proofMethod);
  const [isActive, setIsActive] = React.useState(s.isActive);

  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const err = (k: string) => fieldErrors[k]?.[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      targetUrl: targetUrl.trim() || null,
      instruction: instruction.trim() || null,
      rewardTokens: Number(rewardTokens),
      deadline: deadlineLocal ? new Date(deadlineLocal).toISOString() : null,
      audience: audience.trim() || null,
      proofMethod,
    };
    if (mode === "edit") payload.isActive = isActive;

    const url =
      mode === "create" ? "/api/admin/missions" : `/api/admin/missions/${missionId}`;
    const method = mode === "create" ? "POST" : "PATCH";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.fields) setFieldErrors(data.fields);
        throw new Error(data?.error ?? "Не удалось сохранить задание");
      }
      toast.success(mode === "create" ? "Задание создано" : "Изменения сохранены");
      router.push("/admin/missions");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card>
        <CardContent className="space-y-4 py-5">
          <div>
            <Label htmlFor="m-title">Название</Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Подпишись на канал «Евразия»"
              aria-invalid={Boolean(err("title"))}
              required
            />
            {err("title") && <p className="mt-1 text-xs text-danger-strong">{err("title")}</p>}
          </div>

          <div>
            <Label htmlFor="m-description">Описание</Label>
            <textarea
              id="m-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={5000}
              className={TEXTAREA_CLASS}
              placeholder="Что нужно сделать и зачем"
              aria-invalid={Boolean(err("description"))}
              required
            />
            {err("description") && (
              <p className="mt-1 text-xs text-danger-strong">{err("description")}</p>
            )}
          </div>

          <div>
            <Label htmlFor="m-instruction">Инструкция (необязательно)</Label>
            <textarea
              id="m-instruction"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={2}
              maxLength={2000}
              className={TEXTAREA_CLASS}
              placeholder="Пошагово: зайти, подписаться, поставить лайк, прислать скриншот"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="m-reward">Награда, токенов</Label>
              <Input
                id="m-reward"
                type="number"
                min={1}
                value={rewardTokens}
                onChange={(e) => setRewardTokens(e.target.value)}
                aria-invalid={Boolean(err("rewardTokens"))}
                required
              />
              {err("rewardTokens") && (
                <p className="mt-1 text-xs text-danger-strong">{err("rewardTokens")}</p>
              )}
            </div>
            <div>
              <Label htmlFor="m-proof">Способ проверки</Label>
              <select
                id="m-proof"
                value={proofMethod}
                onChange={(e) => setProofMethod(e.target.value as ProofMethod)}
                className={SELECT_CLASS}
              >
                {PROOF_METHOD_VALUES.map((p) => (
                  <option key={p} value={p}>
                    {PROOF_METHOD_META[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="m-link">Ссылка/цель (необязательно)</Label>
              <Input
                id="m-link"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
                placeholder="https://t.me/…"
                inputMode="url"
                aria-invalid={Boolean(err("targetUrl"))}
              />
              {err("targetUrl") && (
                <p className="mt-1 text-xs text-danger-strong">{err("targetUrl")}</p>
              )}
            </div>
            <div>
              <Label htmlFor="m-deadline">Дедлайн (необязательно)</Label>
              <input
                id="m-deadline"
                type="datetime-local"
                value={deadlineLocal}
                onChange={(e) => setDeadlineLocal(e.target.value)}
                className={SELECT_CLASS}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="m-audience">Аудитория (необязательно)</Label>
            <Input
              id="m-audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="Например: волонтёры из Москвы"
            />
          </div>

          {mode === "edit" && (
            <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-border p-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm font-semibold text-foreground">
                Задание активно (видно волонтёрам)
              </span>
            </label>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />}
          {saving ? "Сохранение…" : mode === "create" ? "Создать задание" : "Сохранить"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => router.push("/admin/missions")}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
