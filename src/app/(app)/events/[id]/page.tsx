import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarBlank,
  Clock,
  MapPin,
  Buildings,
  UsersThree,
} from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/server/auth";
import { getEventDetail } from "@/server/events/queries";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EventStatusBadge } from "@/components/domain/event-status-badge";
import { EventJoinPanel } from "@/components/domain/event-join-panel";
import {
  formatEventDate,
  formatEventTime,
} from "@/lib/events";

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Детальная страница мероприятия.
 * ПК (≥lg): 2 колонки — описание/организатор слева, липкая карточка
 * (награда+места+CTA) справа. Телефон: стопка + sticky-CTA снизу.
 */
export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const viewer = await getCurrentUser();

  const data = await getEventDetail(id, viewer?.id ?? null);
  if (!data) notFound();

  const { event, isOwner, myParticipation } = data;
  const isVolunteer = viewer?.role === "VOLUNTEER";

  return (
    <div className="space-y-5">
      {/* Назад + статус (для владельца — статус события). */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" weight="bold" aria-hidden />
          К каталогу
        </Link>
        {isOwner && <EventStatusBadge status={event.status} />}
      </div>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-8">
        {/* ─── Левая колонка: контент ─── */}
        <div className="space-y-6">
          <header className="space-y-3">
            <Badge variant="primary">{event.category}</Badge>
            <h1 className="text-2xl font-bold tracking-[-0.02em] lg:text-3xl">
              {event.title}
            </h1>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted">
              <span className="inline-flex items-center gap-1.5">
                <CalendarBlank className="size-4" weight="duotone" aria-hidden />
                {formatEventDate(event.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="size-4" weight="duotone" aria-hidden />
                {formatEventTime(event.startsAt)}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="size-4" weight="duotone" aria-hidden />
                {event.location}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <UsersThree className="size-4" weight="duotone" aria-hidden />
                {event.participantsCount} записались
              </span>
            </div>
          </header>

          <section className="space-y-2">
            <h2 className="text-sm font-bold uppercase tracking-[0.04em] text-muted">
              Описание
            </h2>
            <p className="whitespace-pre-line text-[0.9375rem] leading-relaxed text-foreground">
              {event.description}
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-[0.04em] text-muted">
              Организатор
            </h2>
            <Card className="p-4">
              <div className="flex items-start gap-3">
                <span
                  className="flex size-10 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary ring-1 ring-inset ring-primary/10"
                  aria-hidden
                >
                  <Buildings className="size-5" weight="duotone" />
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-foreground">{event.organization.name}</p>
                  {event.organization.description && (
                    <p className="mt-0.5 text-sm leading-relaxed text-muted">
                      {event.organization.description}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          </section>
        </div>

        {/* ─── Правая колонка (ПК): липкая карточка награды/CTA ─── */}
        <aside className="mt-6 hidden lg:mt-0 lg:block">
          <Card className="sticky top-20 p-5">
            <EventJoinPanel
              event={event}
              initialParticipation={myParticipation}
              isOwner={isOwner}
              isVolunteer={isVolunteer}
            />
          </Card>
        </aside>

        {/* ─── Планшет/телефон: карточка под контентом ─── */}
        <aside className="mt-6 lg:hidden">
          <Card className="p-5">
            <EventJoinPanel
              event={event}
              initialParticipation={myParticipation}
              isOwner={isOwner}
              isVolunteer={isVolunteer}
            />
          </Card>
        </aside>
      </div>
    </div>
  );
}
