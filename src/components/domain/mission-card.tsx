import Link from "next/link";
import { Clock, Target, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { TokenAmount } from "@/components/domain/token-amount";
import { MissionStatusBadge } from "@/components/domain/mission-status-badge";
import {
  PROOF_METHOD_META,
  formatMissionDate,
  type MissionListItem,
} from "@/lib/missions";

/** Карточка задания для каталога волонтёра. */
export function MissionCard({ mission }: { mission: MissionListItem }) {
  return (
    <Link
      href={`/missions/${mission.id}`}
      className="group flex h-full flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      <div className="flex items-start justify-between gap-2">
        {mission.myStatus ? (
          <MissionStatusBadge status={mission.myStatus} />
        ) : (
          <span />
        )}
        <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 ring-1 ring-inset ring-warning-strong/15">
          <TokenAmount value={mission.rewardTokens} sign="neutral" withIcon />
        </span>
      </div>

      <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.02em]">
        {mission.title}
      </h3>
      <p className="line-clamp-2 text-sm text-muted">{mission.description}</p>

      <dl className="mt-auto space-y-1.5 border-t border-border pt-3 text-sm text-muted">
        <div className="flex items-center gap-2">
          <Target className="size-4 shrink-0" weight="duotone" aria-hidden />
          <dd className="truncate">{PROOF_METHOD_META[mission.proofMethod]}</dd>
        </div>
        {mission.deadline && (
          <div className="flex items-center gap-2">
            <Clock className="size-4 shrink-0" weight="duotone" aria-hidden />
            <dd className="truncate">до {formatMissionDate(mission.deadline)}</dd>
          </div>
        )}
      </dl>

      <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
        Подробнее
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          weight="bold"
          aria-hidden
        />
      </span>
    </Link>
  );
}
