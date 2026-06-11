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
  REWARD_TYPE_VALUES,
  REWARD_TYPE_META,
  type RewardType,
} from "@/lib/rewards";

export interface RewardFormInitial {
  title: string;
  description: string;
  type: RewardType;
  costTokens: string;
  stock: string;
  /** Значение для <input type="date"> или "". */
  expiresAt: string;
  conditions: string;
  imageUrl: string;
  requiresApproval: boolean;
  isActive: boolean;
}

interface RewardFormProps {
  mode: "create" | "edit";
  rewardId?: string;
  initial?: Partial<RewardFormInitial>;
}

const APPROVAL_BY_DEFAULT: readonly RewardType[] = ["TRIP", "EVENT_ACCESS"];

const EMPTY: RewardFormInitial = {
  title: "",
  description: "",
  type: "DISCOUNT",
  costTokens: "100",
  stock: "",
  expiresAt: "",
  conditions: "",
  imageUrl: "",
  requiresApproval: false,
  isActive: true,
};

const TEXTAREA_CLASS =
  "flex w-full rounded-sm border border-border bg-surface px-3 py-2.5 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] placeholder:text-muted/80 hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";
const SELECT_CLASS =
  "h-10 w-full rounded-sm border border-border bg-surface px-3 text-sm font-medium text-foreground shadow-xs transition-[border-color,box-shadow] hover:border-border-strong focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

/** Форма создания/редактирования награды (партнёр). */
export function RewardForm({ mode, rewardId, initial }: RewardFormProps) {
  const router = useRouter();
  const start = { ...EMPTY, ...initial };

  const [title, setTitle] = React.useState(start.title);
  const [description, setDescription] = React.useState(start.description);
  const [type, setType] = React.useState<RewardType>(start.type);
  const [costTokens, setCostTokens] = React.useState(start.costTokens);
  const [stock, setStock] = React.useState(start.stock);
  const [expiresAt, setExpiresAt] = React.useState(start.expiresAt);
  const [conditions, setConditions] = React.useState(start.conditions);
  const [imageUrl, setImageUrl] = React.useState(start.imageUrl);
  // requiresApproval: в create по умолчанию следует за типом, пока не тронут вручную.
  const [approvalTouched, setApprovalTouched] = React.useState(mode === "edit");
  const [requiresApproval, setRequiresApproval] = React.useState(
    start.requiresApproval,
  );
  const [isActive, setIsActive] = React.useState(start.isActive);

  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string[]>>({});
  const err = (key: string) => fieldErrors[key]?.[0];

  function onTypeChange(value: RewardType) {
    setType(value);
    if (!approvalTouched) setRequiresApproval(APPROVAL_BY_DEFAULT.includes(value));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim(),
      type,
      costTokens: Number(costTokens),
      stock: stock.trim() === "" ? null : Number(stock),
      expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      conditions: conditions.trim() || null,
      imageUrl: imageUrl.trim() || null,
      requiresApproval,
    };
    if (mode === "edit") payload.isActive = isActive;

    const url =
      mode === "create" ? "/api/partner/rewards" : `/api/partner/rewards/${rewardId}`;
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
        throw new Error(data?.error ?? "Не удалось сохранить награду");
      }
      toast.success(mode === "create" ? "Награда создана" : "Изменения сохранены");
      router.push("/partner/rewards");
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
            <Label htmlFor="rw-title">Название</Label>
            <Input
              id="rw-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Скидка 20% на кофе"
              aria-invalid={Boolean(err("title"))}
              required
            />
            {err("title") && <p className="mt-1 text-xs text-danger-strong">{err("title")}</p>}
          </div>

          <div>
            <Label htmlFor="rw-description">Описание</Label>
            <textarea
              id="rw-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              maxLength={5000}
              placeholder="Что получает волонтёр, как воспользоваться…"
              className={TEXTAREA_CLASS}
              aria-invalid={Boolean(err("description"))}
              required
            />
            {err("description") && (
              <p className="mt-1 text-xs text-danger-strong">{err("description")}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rw-type">Тип награды</Label>
              <select
                id="rw-type"
                value={type}
                onChange={(e) => onTypeChange(e.target.value as RewardType)}
                className={SELECT_CLASS}
              >
                {REWARD_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {REWARD_TYPE_META[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="rw-cost">Стоимость, токенов</Label>
              <Input
                id="rw-cost"
                type="number"
                min={1}
                value={costTokens}
                onChange={(e) => setCostTokens(e.target.value)}
                aria-invalid={Boolean(err("costTokens"))}
                required
              />
              {err("costTokens") && (
                <p className="mt-1 text-xs text-danger-strong">{err("costTokens")}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rw-stock">Количество (пусто — без лимита)</Label>
              <Input
                id="rw-stock"
                type="number"
                min={0}
                value={stock}
                onChange={(e) => setStock(e.target.value)}
                placeholder="Без ограничений"
              />
            </div>
            <div>
              <Label htmlFor="rw-expires">Действует до (необязательно)</Label>
              <input
                id="rw-expires"
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className={SELECT_CLASS}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rw-conditions">Условия получения (необязательно)</Label>
            <textarea
              id="rw-conditions"
              value={conditions}
              onChange={(e) => setConditions(e.target.value)}
              rows={2}
              maxLength={2000}
              placeholder="Например: при предъявлении кода на кассе"
              className={TEXTAREA_CLASS}
            />
          </div>

          <div>
            <Label htmlFor="rw-image">Ссылка на изображение (необязательно)</Label>
            <Input
              id="rw-image"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://…"
              inputMode="url"
              aria-invalid={Boolean(err("imageUrl"))}
            />
            {err("imageUrl") && (
              <p className="mt-1 text-xs text-danger-strong">{err("imageUrl")}</p>
            )}
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border p-3">
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => {
                setApprovalTouched(true);
                setRequiresApproval(e.target.checked);
              }}
              className="mt-0.5 size-4 accent-[var(--color-primary)]"
            />
            <span className="text-sm">
              <span className="font-semibold text-foreground">Требует заявки и одобрения</span>
              <span className="mt-0.5 block text-xs text-muted">
                Для крупных наград (поездки, доступ на события): токены резервируются,
                выдача — после подтверждения администратором.
              </span>
            </span>
          </label>

          {mode === "edit" && (
            <label className="flex cursor-pointer items-center gap-3 rounded-sm border border-border p-3">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              <span className="text-sm font-semibold text-foreground">
                Награда активна (видна в каталоге)
              </span>
            </label>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />}
          {saving ? "Сохранение…" : mode === "create" ? "Создать награду" : "Сохранить"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => router.push("/partner/rewards")}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}
