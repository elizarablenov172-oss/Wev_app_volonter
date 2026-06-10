"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  QrCode,
  CircleNotch,
  Coins,
  UsersThree,
  CalendarBlank,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TokenAmount } from "@/components/domain/token-amount";
import { ParticipationStatusBadge } from "@/components/domain/event-status-badge";
import {
  canCheckIn,
  isConfirmedStatus,
  formatEventDateTime,
  type EventDetail,
  type MyParticipation,
} from "@/lib/events";

interface EventJoinPanelProps {
  event: EventDetail;
  initialParticipation: MyParticipation | null;
  isOwner: boolean;
  /** Роль зрителя — записываться может только волонтёр. */
  isVolunteer: boolean;
  /** Компактный режим для sticky-бара на телефоне (без шапки-награды). */
  compact?: boolean;
}

/**
 * Карточка записи/чек-ина для детальной страницы события.
 * CTA по статусу участия:
 *  • нет участия → «Записаться» (POST /join)
 *  • REGISTERED/CHECKED_IN → «Вы записаны» + «Чек-ин» (на /events/[id]/checkin)
 *  • CONFIRMED/COMPLETED → «Участие подтверждено ✓ +N токенов»
 *  • мест нет → запись отключена
 */
export function EventJoinPanel({
  event,
  initialParticipation,
  isOwner,
  isVolunteer,
  compact = false,
}: EventJoinPanelProps) {
  const router = useRouter();
  const [participation, setParticipation] = React.useState<MyParticipation | null>(
    initialParticipation,
  );
  const [joining, setJoining] = React.useState(false);

  const full = event.spotsLeft <= 0;
  const confirmed = participation != null && isConfirmedStatus(participation.status);
  const registered = participation != null && canCheckIn(participation.status);

  async function handleJoin() {
    setJoining(true);
    try {
      const res = await fetch(`/api/events/${event.id}/join`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось записаться на мероприятие");
      }
      setParticipation({
        id: data.participation.id,
        status: data.participation.status,
        checkInMethod: null,
        checkedInAt: null,
        rewarded: false,
      });
      toast.success("Вы записаны на мероприятие");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка записи");
    } finally {
      setJoining(false);
    }
  }

  // ─── CTA-блок (зависит от состояния) ───
  let cta: React.ReactNode;

  if (isOwner) {
    cta = (
      <p className="rounded-sm bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-muted">
        Это ваше мероприятие. Управление — в кабинете организации.
      </p>
    );
  } else if (!isVolunteer) {
    cta = (
      <p className="rounded-sm bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-muted">
        Записаться на мероприятие может только волонтёр.
      </p>
    );
  } else if (confirmed) {
    cta = (
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 rounded-sm bg-success-soft px-3 py-3 text-center ring-1 ring-inset ring-success-strong/15">
          <SealCheck className="size-5 text-success-strong" weight="fill" aria-hidden />
          <span className="text-sm font-bold text-success-strong">
            Участие подтверждено
          </span>
        </div>
        <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-muted">
          Начислено
          <TokenAmount value={event.rewardTokens} sign="plus" withIcon />
        </p>
      </div>
    );
  } else if (registered) {
    cta = (
      <div className="space-y-2.5">
        <div className="flex items-center justify-center gap-2 rounded-sm bg-primary-soft px-3 py-2.5 text-center ring-1 ring-inset ring-primary/15">
          <CheckCircle className="size-5 text-primary" weight="fill" aria-hidden />
          <span className="text-sm font-bold text-primary">Вы записаны</span>
        </div>
        <Link
          href={`/events/${event.id}/checkin`}
          className={cn(buttonVariants({ size: "lg" }), "w-full")}
        >
          <QrCode className="size-5" weight="duotone" aria-hidden />
          Пройти чек-ин
        </Link>
        <p className="text-center text-xs text-muted">
          Отметьтесь на месте через QR-код или геолокацию, чтобы получить токены.
        </p>
      </div>
    );
  } else if (full) {
    cta = (
      <Button className="w-full" size="lg" disabled>
        Свободных мест нет
      </Button>
    );
  } else {
    cta = (
      <Button
        className="w-full"
        size="lg"
        onClick={handleJoin}
        disabled={joining}
      >
        {joining && (
          <CircleNotch className="size-5 animate-spin" weight="bold" aria-hidden />
        )}
        {joining ? "Записываем…" : "Записаться на мероприятие"}
      </Button>
    );
  }

  // Компактный sticky-бар для телефона: только текущий статус + CTA-кнопка.
  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <Coins className="size-4 shrink-0 text-tokens" weight="duotone" aria-hidden />
            <span className="tabular text-sm font-bold">
              +{event.rewardTokens} токенов
            </span>
          </div>
          <p className="truncate text-xs text-muted">
            {full ? "Мест нет" : `${event.spotsLeft} мест свободно`}
          </p>
        </div>
        <div className="w-1/2 shrink-0">{cta}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {participation && (
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-muted">Ваш статус</span>
          <ParticipationStatusBadge status={participation.status} />
        </div>
      )}

      {/* Награда — крупно. */}
      <div className="rounded-md bg-warning-soft px-4 py-4 ring-1 ring-inset ring-warning-strong/15">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-warning-strong">
          Награда за участие
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <Coins className="size-6 self-center text-tokens" weight="duotone" aria-hidden />
          <span className="tabular text-3xl font-extrabold tracking-[-0.03em] text-warning-strong">
            {event.rewardTokens}
          </span>
          <span className="text-sm font-semibold text-warning-strong">токенов</span>
        </div>
      </div>

      {/* Места и дата. */}
      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted">
            <UsersThree className="size-4" weight="duotone" aria-hidden />
            Свободно мест
          </dt>
          <dd className={`tabular font-bold ${full ? "text-danger-strong" : "text-foreground"}`}>
            {event.spotsLeft} / {event.capacity}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted">
            <CalendarBlank className="size-4" weight="duotone" aria-hidden />
            Начало
          </dt>
          <dd className="text-right font-semibold text-foreground">
            {formatEventDateTime(event.startsAt)}
          </dd>
        </div>
      </dl>

      <div className="border-t border-border pt-4">{cta}</div>
    </div>
  );
}
