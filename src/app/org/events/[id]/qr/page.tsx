import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { getEventQrData } from "@/server/events/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { QrDisplay } from "@/components/domain/qr-display";

interface QrPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Страница QR-кода чек-ина для показа волонтёрам на месте.
 * Доступна только владельцу-организации и только для опубликованных событий.
 */
export default async function EventQrPage({ params }: QrPageProps) {
  const { id } = await params;
  const user = await requireRole(["ORGANIZATION"]);

  const event = await getEventQrData(id, user.id);
  if (!event) notFound();

  return (
    <div className="mx-auto w-full max-w-md space-y-5">
      <div>
        <Link
          href={`/org/events/${id}/participants`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" weight="bold" aria-hidden />
          К участникам
        </Link>
      </div>

      <PageHeader
        title="QR-код чек-ина"
        description={`«${event.title}» — покажите этот код волонтёрам для отметки на месте.`}
      />

      {event.status !== "PUBLISHED" ? (
        <EmptyState
          title="QR доступен после публикации"
          description="Чек-ин по QR работает только для опубликованных мероприятий. Дождитесь одобрения модератором."
        />
      ) : (
        <QrDisplay eventId={id} />
      )}
    </div>
  );
}
