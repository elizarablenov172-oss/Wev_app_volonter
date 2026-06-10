import Link from "next/link";
import {
  CalendarDots,
  Plus,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { getOrgEvents } from "@/server/events/queries";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { TokenAmount } from "@/components/domain/token-amount";
import { EventStatusBadge } from "@/components/domain/event-status-badge";
import { formatEventDateTime } from "@/lib/events";

/**
 * Мероприятия организации. ПК: широкая таблица; телефон: карточки.
 * Каждая строка ведёт к управлению (участники / QR / редактирование).
 */
export default async function OrgEventsPage() {
  const user = await requireRole(["ORGANIZATION"]);
  const events = await getOrgEvents(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои мероприятия"
        description="Создавайте события, управляйте участниками и подтверждайте участие."
        actions={
          <Link href="/org/events/new" className={cn(buttonVariants())}>
            <Plus className="size-4" weight="bold" aria-hidden />
            Создать
          </Link>
        }
      />

      {events.length === 0 ? (
        <EmptyState
          icon={CalendarDots}
          title="Пока нет мероприятий"
          description="Создайте первое мероприятие — после одобрения модератором оно появится в каталоге волонтёров."
          action={
            <Link href="/org/events/new" className={cn(buttonVariants())}>
              <Plus className="size-4" weight="bold" aria-hidden />
              Создать мероприятие
            </Link>
          }
        />
      ) : (
        <>
          {/* ПК (≥md): таблица во всю ширину. */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                  <th className="px-4 py-3">Мероприятие</th>
                  <th className="px-4 py-3">Дата</th>
                  <th className="px-4 py-3">Категория</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3 text-right">Участники</th>
                  <th className="px-4 py-3 text-right">Награда</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr
                    key={e.id}
                    className="border-b border-border last:border-0 transition-colors hover:bg-surface-muted/40"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/org/events/${e.id}/participants`}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {e.title}
                      </Link>
                      <p className="text-xs text-muted">{e.location}</p>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {formatEventDateTime(e.startsAt)}
                    </td>
                    <td className="px-4 py-3 text-muted">{e.category}</td>
                    <td className="px-4 py-3">
                      <EventStatusBadge status={e.status} />
                    </td>
                    <td className="tabular px-4 py-3 text-right font-semibold">
                      {e.participantsCount} / {e.capacity}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TokenAmount value={e.rewardTokens} sign="neutral" />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <OrgEventActions id={e.id} status={e.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Телефон (<md): карточки. */}
          <ul className="space-y-3 md:hidden">
            {events.map((e) => (
              <li key={e.id}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/org/events/${e.id}/participants`}
                      className="min-w-0 font-bold text-foreground"
                    >
                      {e.title}
                    </Link>
                    <EventStatusBadge status={e.status} />
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatEventDateTime(e.startsAt)} · {e.location}
                  </p>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-sm">
                    <span className="tabular font-semibold">
                      {e.participantsCount} / {e.capacity} участн.
                    </span>
                    <TokenAmount value={e.rewardTokens} sign="neutral" withIcon />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <OrgEventActions id={e.id} status={e.status} />
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

/** Кнопки-действия по мероприятию: участники, QR (только PUBLISHED), редактирование (черновик/на модерации/отклонено). */
function OrgEventActions({
  id,
  status,
}: {
  id: string;
  status: import("@/lib/events").EventStatus;
}) {
  const canEdit = status === "DRAFT" || status === "PENDING" || status === "REJECTED";
  const canQr = status === "PUBLISHED";

  return (
    <div className="inline-flex flex-wrap items-center justify-end gap-2">
      <Link
        href={`/org/events/${id}/participants`}
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
      >
        Участники
        <CaretRight className="size-3.5" weight="bold" aria-hidden />
      </Link>
      {canQr && (
        <Link
          href={`/org/events/${id}/qr`}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          QR
        </Link>
      )}
      {canEdit && (
        <Link
          href={`/org/events/${id}/edit`}
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
        >
          Изменить
        </Link>
      )}
    </div>
  );
}
