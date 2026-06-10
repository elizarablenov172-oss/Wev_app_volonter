"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, Check } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { isConfirmedStatus, type ParticipationStatus } from "@/lib/events";

interface ParticipantConfirmButtonProps {
  eventId: string;
  userId: string;
  status: ParticipationStatus;
  /** Компактная кнопка (для мобильной карточки). */
  size?: "sm" | "md";
}

/**
 * Кнопка «Подтвердить участие» (организация).
 * POST /api/org/events/[id]/participants/[uid]/confirm → начисление токенов.
 * Идемпотентно: если уже подтверждён — кнопка показывает статус, без действия.
 */
export function ParticipantConfirmButton({
  eventId,
  userId,
  status,
  size = "sm",
}: ParticipantConfirmButtonProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [confirmed, setConfirmed] = React.useState(isConfirmedStatus(status));

  const cancelled = status === "CANCELLED" || status === "NO_SHOW";

  if (confirmed) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-strong">
        <Check className="size-4" weight="bold" aria-hidden />
        Подтверждён
      </span>
    );
  }

  if (cancelled) {
    return <span className="text-xs font-medium text-muted">—</span>;
  }

  async function handleConfirm() {
    setPending(true);
    try {
      const res = await fetch(
        `/api/org/events/${eventId}/participants/${userId}/confirm`,
        { method: "POST", credentials: "same-origin" },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось подтвердить участие");
      }
      const awarded = typeof data?.awarded === "number" ? data.awarded : 0;
      setConfirmed(true);
      if (awarded > 0) toast.success(`+${awarded} токенов начислено`);
      else toast.success("Участие подтверждено");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка подтверждения");
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="success"
      size={size}
      onClick={handleConfirm}
      disabled={pending}
    >
      {pending ? (
        <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
      ) : (
        <Check className="size-4" weight="bold" aria-hidden />
      )}
      Подтвердить
    </Button>
  );
}
