import { notFound } from "next/navigation";
import Link from "next/link";
import {
  CaretLeft,
  Target,
  Clock,
  UsersThree,
  LinkSimple,
} from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/server/auth";
import { getMissionDetail } from "@/server/missions/queries";
import { MissionStatusBadge } from "@/components/domain/mission-status-badge";
import { MissionActionPanel } from "@/components/domain/mission-action-panel";
import { PROOF_METHOD_META, formatMissionDate } from "@/lib/missions";

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await getMissionDetail(id, user?.id ?? "");
  if (!data) notFound();

  const { mission, submission, myStatus } = data;

  const panel = (
    <MissionActionPanel
      missionId={mission.id}
      proofMethod={mission.proofMethod}
      rewardTokens={mission.rewardTokens}
      isVolunteer={user?.role === "VOLUNTEER"}
      isAuthenticated={Boolean(user)}
      initialStatus={myStatus}
      moderatorNote={submission?.moderatorNote ?? null}
    />
  );

  return (
    <div className="space-y-5">
      <Link
        href="/missions"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К заданиям
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="space-y-5">
          <div>
            <MissionStatusBadge status={myStatus} />
            <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] lg:text-3xl">
              {mission.title}
            </h1>
          </div>

          <section className="rounded-lg border border-border bg-surface shadow-xs">
            <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              Описание
            </h2>
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-foreground">
              {mission.description}
            </p>
          </section>

          {mission.instruction && (
            <section className="rounded-lg border border-border bg-surface shadow-xs">
              <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                Инструкция
              </h2>
              <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-foreground">
                {mission.instruction}
              </p>
            </section>
          )}

          <section className="rounded-lg border border-border bg-surface shadow-xs">
            <dl className="divide-y divide-border text-sm">
              <div className="flex items-center justify-between gap-3 px-5 py-3">
                <dt className="inline-flex items-center gap-2 text-muted">
                  <Target className="size-4" weight="duotone" aria-hidden />
                  Способ проверки
                </dt>
                <dd className="font-semibold">{PROOF_METHOD_META[mission.proofMethod]}</dd>
              </div>
              {mission.deadline && (
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <dt className="inline-flex items-center gap-2 text-muted">
                    <Clock className="size-4" weight="duotone" aria-hidden />
                    Дедлайн
                  </dt>
                  <dd className="font-semibold">{formatMissionDate(mission.deadline)}</dd>
                </div>
              )}
              {mission.audience && (
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <dt className="inline-flex items-center gap-2 text-muted">
                    <UsersThree className="size-4" weight="duotone" aria-hidden />
                    Аудитория
                  </dt>
                  <dd className="text-right font-semibold">{mission.audience}</dd>
                </div>
              )}
              {mission.targetUrl && (
                <div className="flex items-center justify-between gap-3 px-5 py-3">
                  <dt className="inline-flex items-center gap-2 text-muted">
                    <LinkSimple className="size-4" weight="duotone" aria-hidden />
                    Ссылка
                  </dt>
                  <dd className="min-w-0">
                    <a
                      href={mission.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block truncate font-semibold text-primary hover:underline"
                    >
                      {mission.targetUrl}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm lg:hidden">
            {panel}
          </div>
        </div>

        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            {panel}
          </div>
        </aside>
      </div>
    </div>
  );
}
