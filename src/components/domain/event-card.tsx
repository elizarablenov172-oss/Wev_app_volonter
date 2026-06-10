import Link from "next/link";
import {
  CalendarBlank,
  MapPin,
  UsersThree,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { TokenAmount } from "@/components/domain/token-amount";
import {
  formatEventDateTime,
  type EventListItem,
} from "@/lib/events";

interface EventCardProps {
  event: EventListItem;
}

/**
 * Карточка мероприятия для каталога волонтёра.
 * Обложка-плейсхолдер с инициалом категории, чип категории, дата/город,
 * награда в токенах и количество свободных мест. Вся карточка — ссылка.
 */
export function EventCard({ event }: EventCardProps) {
  const full = event.spotsLeft <= 0;

  return (
    <Link
      href={`/events/${event.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      {/* Обложка-плейсхолдер: мягкий фиолетовый градиент + крупная буква категории. */}
      <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-primary-soft to-surface-muted">
        <span
          className="text-4xl font-black tracking-[-0.04em] text-primary/30 select-none"
          aria-hidden
        >
          {event.category.charAt(0).toUpperCase()}
        </span>
        <Badge variant="primary" className="absolute left-3 top-3">
          {event.category}
        </Badge>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.02em] text-foreground">
          {event.title}
        </h3>

        <dl className="space-y-1.5 text-sm text-muted">
          <div className="flex items-center gap-2">
            <CalendarBlank className="size-4 shrink-0" weight="duotone" aria-hidden />
            <dd className="truncate">{formatEventDateTime(event.startsAt)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 shrink-0" weight="duotone" aria-hidden />
            <dd className="truncate">{event.location}</dd>
          </div>
          <div className="flex items-center gap-2">
            <UsersThree className="size-4 shrink-0" weight="duotone" aria-hidden />
            <dd className={full ? "font-semibold text-danger-strong" : "truncate"}>
              {full ? "Мест нет" : `${event.spotsLeft} мест свободно`}
            </dd>
          </div>
        </dl>

        {/* Подвал карточки: награда + стрелка-CTA. */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 ring-1 ring-inset ring-warning-strong/15">
            <TokenAmount value={event.rewardTokens} sign="plus" withIcon />
          </span>
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
            Подробнее
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              weight="bold"
              aria-hidden
            />
          </span>
        </div>
      </div>
    </Link>
  );
}
