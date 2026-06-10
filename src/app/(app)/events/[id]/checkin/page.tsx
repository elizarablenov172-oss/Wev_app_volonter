import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getEventDetail } from "@/server/events/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { CheckinFlow } from "@/components/domain/checkin-flow";
import { canCheckIn, isConfirmedStatus } from "@/lib/events";

interface CheckinPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Страница чек-ина волонтёра. Клиентский флоу с вкладками QR / Геолокация.
 * Доступна тем, у кого есть действующая запись на это мероприятие.
 */
export default async function CheckinPage({ params }: CheckinPageProps) {
  const { id } = await params;
  const user = await requireUser();

  const data = await getEventDetail(id, user.id);
  if (!data) notFound();

  const { event, myParticipation } = data;
  const alreadyConfirmed =
    myParticipation != null && isConfirmedStatus(myParticipation.status);
  const canDoCheckin =
    user.role === "VOLUNTEER" &&
    myParticipation != null &&
    canCheckIn(myParticipation.status);

  return (
    <div className="mx-auto w-full max-w-lg space-y-5">
      <div>
        <Link
          href={`/events/${id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" weight="bold" aria-hidden />
          К мероприятию
        </Link>
      </div>

      <PageHeader
        title="Чек-ин"
        description={`«${event.title}» — отметьтесь на месте, чтобы получить токены.`}
      />

      {alreadyConfirmed ? (
        <EmptyState
          title="Участие уже подтверждено"
          description="Токены за это мероприятие уже начислены. Спасибо за участие!"
        />
      ) : !canDoCheckin ? (
        <EmptyState
          title="Сначала запишитесь на мероприятие"
          description="Чек-ин доступен только записавшимся волонтёрам. Вернитесь к мероприятию и нажмите «Записаться»."
        />
      ) : (
        <CheckinFlow
          eventId={event.id}
          eventTitle={event.title}
          geoEnabled={event.geoLat != null && event.geoLng != null}
        />
      )}
    </div>
  );
}
