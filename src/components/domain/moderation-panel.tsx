"use client";

import * as React from "react";
import {
  CheckCircle,
  XCircle,
  CircleNotch,
  CalendarBlank,
  MapPin,
  UsersThree,
  Buildings,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  formatEventDateTime,
  type ModerationEventItem,
} from "@/lib/events";

interface ModerationPanelProps {
  event: ModerationEventItem;
  /** Вызывается после успешного решения — родитель убирает событие из очереди. */
  onResolved: (eventId: string) => void;
}

const DEFAULT_REWARD = 50;

/**
 * Панель модерации мероприятия: превью + поле «Награда в токенах» (обязательно
 * >0 для approve) + кнопки «Одобрить» (success) / «Отклонить» (danger, с причиной).
 * POST /api/admin/events/[id]/moderate.
 */
export function ModerationPanel({ event, onResolved }: ModerationPanelProps) {
  const [reward, setReward] = React.useState(String(DEFAULT_REWARD));
  const [reason, setReason] = React.useState("");
  const [pending, setPending] = React.useState<null | "approve" | "reject">(null);
  const [rewardError, setRewardError] = React.useState<string | null>(null);

  async function moderate(action: "approve" | "reject") {
    setRewardError(null);

    let body: Record<string, unknown>;
    if (action === "approve") {
      const value = Number(reward);
      if (!Number.isInteger(value) || value <= 0) {
        setRewardError("Награда должна быть целым числом больше нуля");
        return;
      }
      body = { action, rewardTokens: value, reason: reason.trim() || undefined };
    } else {
      body = { action, reason: reason.trim() || undefined };
    }

    setPending(action);
    try {
      const res = await fetch(`/api/admin/events/${event.id}/moderate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (data?.fields?.rewardTokens) {
          setRewardError(data.fields.rewardTokens[0]);
        }
        throw new Error(data?.error ?? "Не удалось применить решение");
      }
      toast.success(
        action === "approve"
          ? `Мероприятие одобрено · награда ${body.rewardTokens} токенов`
          : "Мероприятие отклонено",
      );
      onResolved(event.id);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка модерации");
    } finally {
      setPending(null);
    }
  }

  const busy = pending !== null;

  return (
    <div className="space-y-5">
      {/* Превью мероприятия. */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="primary">{event.category}</Badge>
          <span className="inline-flex items-center gap-1.5 text-sm text-muted">
            <Buildings className="size-4" weight="duotone" aria-hidden />
            {event.organization.name}
          </span>
        </div>
        <h2 className="text-xl font-bold tracking-[-0.02em]">{event.title}</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted">
          <span className="inline-flex items-center gap-1.5">
            <CalendarBlank className="size-4" weight="duotone" aria-hidden />
            {formatEventDateTime(event.startsAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-4" weight="duotone" aria-hidden />
            {event.location}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UsersThree className="size-4" weight="duotone" aria-hidden />
            {event.capacity} мест
          </span>
        </div>
        <p className="whitespace-pre-line rounded-sm bg-surface-muted px-3.5 py-3 text-sm leading-relaxed text-foreground">
          {event.description}
        </p>
      </div>

      {/* Решение модерации. */}
      <div className="space-y-4 border-t border-border pt-4">
        <div>
          <Label htmlFor={`reward-${event.id}`}>Награда в токенах</Label>
          <Input
            id={`reward-${event.id}`}
            type="number"
            min={1}
            value={reward}
            onChange={(e) => setReward(e.target.value)}
            aria-invalid={Boolean(rewardError)}
            disabled={busy}
          />
          {rewardError ? (
            <p className="mt-1 text-xs text-danger-strong">{rewardError}</p>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Сколько токенов получит волонтёр за подтверждённое участие. Обязательно
              больше нуля для одобрения.
            </p>
          )}
        </div>

        <div>
          <Label htmlFor={`reason-${event.id}`}>
            Причина / комментарий{" "}
            <span className="font-normal text-muted">(нужно при отклонении)</span>
          </Label>
          <Input
            id={`reason-${event.id}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Например: уточните место проведения"
            maxLength={500}
            disabled={busy}
          />
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            variant="success"
            className="flex-1"
            onClick={() => moderate("approve")}
            disabled={busy}
          >
            {pending === "approve" ? (
              <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
            ) : (
              <CheckCircle className="size-4" weight="fill" aria-hidden />
            )}
            Одобрить
          </Button>
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => moderate("reject")}
            disabled={busy}
          >
            {pending === "reject" ? (
              <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
            ) : (
              <XCircle className="size-4" weight="fill" aria-hidden />
            )}
            Отклонить
          </Button>
        </div>
      </div>
    </div>
  );
}
