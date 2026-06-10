import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  UsersThree,
  QrCode,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { getEventParticipants } from "@/server/events/queries";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { ParticipationStatusBadge } from "@/components/domain/event-status-badge";
import { ParticipantConfirmButton } from "@/components/domain/participant-confirm-button";
import { CHECKIN_METHOD_LABEL, formatEventDateTime } from "@/lib/events";
import type { ParticipantItem } from "@/lib/events";

interface ParticipantsPageProps {
  params: Promise<{ id: string }>;
}

/**
 * Список участников мероприятия (организация).
 * ПК: широкая таблица; телефон: карточки. Кнопка «Подтвердить участие»
 * начисляет токены волонтёру (toast «+N токенов начислено»).
 */
export default async function ParticipantsPage({ params }: ParticipantsPageProps) {
  const { id } = await params;
  const user = await requireRole(["ORGANIZATION"]);

  const data = await getEventParticipants(id, user.id);
  if (!data) notFound();

  return (
    <div className="space-y-6">
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
        title="Участники"
        description={data.event.title}
        actions={
          <Link
            href={`/org/events/${id}/qr`}
            className={cn(buttonVariants({ variant: "secondary" }))}
          >
            <QrCode className="size-4" weight="duotone" aria-hidden />
            QR для чек-ина
          </Link>
        }
      />

      <p className="text-sm text-muted">
        Записано:{" "}
        <span className="tabular font-semibold text-foreground">
          {data.participantsCount} / {data.event.capacity}
        </span>
      </p>

      {data.items.length === 0 ? (
        <EmptyState
          icon={UsersThree}
          title="Пока никто не записался"
          description="Как только волонтёры начнут записываться, они появятся здесь. Покажите QR-код на месте для быстрого чек-ина."
        />
      ) : (
        <>
          {/* ПК (≥md): таблица. */}
          <Card className="hidden overflow-hidden md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-muted/60 text-left text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                  <th className="px-4 py-3">Волонтёр</th>
                  <th className="px-4 py-3">Город</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3">Чек-ин</th>
                  <th className="px-4 py-3 text-right">Действие</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((p) => (
                  <tr
                    key={p.participationId}
                    className="border-b border-border last:border-0"
                  >
                    <td className="px-4 py-3">
                      <ParticipantIdentity participant={p} />
                    </td>
                    <td className="px-4 py-3 text-muted">{p.user.city ?? "—"}</td>
                    <td className="px-4 py-3">
                      <ParticipationStatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {p.checkInMethod ? (
                        <span>
                          {CHECKIN_METHOD_LABEL[p.checkInMethod]}
                          {p.checkedInAt && (
                            <span className="block text-xs">
                              {formatEventDateTime(p.checkedInAt)}
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ParticipantConfirmButton
                        eventId={id}
                        userId={p.user.id}
                        status={p.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {/* Телефон (<md): карточки. */}
          <ul className="space-y-3 md:hidden">
            {data.items.map((p) => (
              <li key={p.participationId}>
                <Card className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <ParticipantIdentity participant={p} />
                    <ParticipationStatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                    <span className="text-xs text-muted">
                      {p.checkInMethod
                        ? CHECKIN_METHOD_LABEL[p.checkInMethod]
                        : "Без чек-ина"}
                    </span>
                    <ParticipantConfirmButton
                      eventId={id}
                      userId={p.user.id}
                      status={p.status}
                    />
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

/** Аватар-инициал + имя/никнейм волонтёра. */
function ParticipantIdentity({ participant }: { participant: ParticipantItem }) {
  const { user } = participant;
  return (
    <div className="flex items-center gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-sm font-bold text-primary ring-1 ring-inset ring-primary/10"
        aria-hidden
      >
        {user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.avatarUrl}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          user.displayName.charAt(0).toUpperCase()
        )}
      </span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-foreground">{user.displayName}</p>
        {user.nickname && (
          <p className="truncate text-xs text-muted">@{user.nickname}</p>
        )}
      </div>
    </div>
  );
}
