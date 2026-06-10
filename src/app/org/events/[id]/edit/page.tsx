import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { getOrgEventForEdit } from "@/server/events/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { EventForm } from "@/components/domain/event-form";
import { EVENT_STATUS_META, isoToDatetimeLocal } from "@/lib/events";

interface EditOrgEventPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Редактирование мероприятия организацией.
 * Доступно только для статусов DRAFT / PENDING / REJECTED (как и API PATCH).
 */
export default async function EditOrgEventPage({ params }: EditOrgEventPageProps) {
  const { id } = await params;
  const user = await requireRole(["ORGANIZATION"]);

  const event = await getOrgEventForEdit(id, user.id);
  if (!event) notFound();

  const editable =
    event.status === "DRAFT" ||
    event.status === "PENDING" ||
    event.status === "REJECTED";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <Link
          href="/org/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" weight="bold" aria-hidden />
          К моим мероприятиям
        </Link>
      </div>

      <PageHeader
        title="Редактирование мероприятия"
        description="Изменения снова уходят на модерацию администратору."
      />

      {editable ? (
        <EventForm
          mode="edit"
          eventId={event.id}
          initial={{
            title: event.title,
            description: event.description,
            startsAtLocal: isoToDatetimeLocal(event.startsAt),
            location: event.location,
            geoLat: event.geoLat != null ? String(event.geoLat) : "",
            geoLng: event.geoLng != null ? String(event.geoLng) : "",
            capacity: String(event.capacity),
            category: event.category,
          }}
        />
      ) : (
        <EmptyState
          title="Это мероприятие нельзя редактировать"
          description={`Редактирование доступно только для черновиков, событий на модерации и отклонённых. Текущий статус: «${EVENT_STATUS_META[event.status].label}».`}
        />
      )}
    </div>
  );
}
