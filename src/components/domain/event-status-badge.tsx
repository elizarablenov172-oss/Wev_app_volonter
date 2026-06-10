import { Badge } from "@/components/ui/badge";
import {
  EVENT_STATUS_META,
  PARTICIPATION_STATUS_META,
  type EventStatus,
  type ParticipationStatus,
} from "@/lib/events";

interface EventStatusBadgeProps {
  status: EventStatus;
  className?: string;
}

/** Бейдж статуса мероприятия (цвета — по словарю дизайн-системы). */
export function EventStatusBadge({ status, className }: EventStatusBadgeProps) {
  const meta = EVENT_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}

interface ParticipationStatusBadgeProps {
  status: ParticipationStatus;
  className?: string;
}

/** Бейдж статуса участия волонтёра. */
export function ParticipationStatusBadge({
  status,
  className,
}: ParticipationStatusBadgeProps) {
  const meta = PARTICIPATION_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
