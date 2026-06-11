import Link from "next/link";
import { UsersThree, CaretRight } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { getOrgEvents } from "@/server/events/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/domain/empty-state";
import { EventStatusBadge } from "@/components/domain/event-status-badge";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatEventDateTime } from "@/lib/events";

/**
 * Участники по всем мероприятиям организации (хаб).
 * Каждая карточка ведёт к управлению участниками конкретного события,
 * где можно подтвердить участие и начислить токены.
 */
export default async function OrgParticipantsPage() {
  const user = await requireRole(["ORGANIZATION"]);
  const events = await getOrgEvents(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Участники"
        description="Участники по вашим мероприятиям. Откройте мероприятие, чтобы подтвердить участие."
      />

      {events.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="Пока нет мероприятий"
          description="Создайте мероприятие — записавшиеся волонтёры появятся здесь."
          action={
            <Link href="/org/events/new" className={cn(buttonVariants())}>
              Создать мероприятие
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id}>
              <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold tracking-[-0.01em]">{e.title}</p>
                    <EventStatusBadge status={e.status} />
                  </div>
                  <p className="mt-0.5 text-sm text-muted">
                    {formatEventDateTime(e.startsAt)} · {e.location}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4">
                  <div className="text-right">
                    <p className="tabular text-lg font-extrabold leading-none">
                      {e.participantsCount} / {e.capacity}
                    </p>
                    <p className="mt-1 text-xs text-muted">участников</p>
                  </div>
                  <Link
                    href={`/org/events/${e.id}/participants`}
                    className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
                  >
                    Открыть
                    <CaretRight className="size-3.5" weight="bold" aria-hidden />
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
