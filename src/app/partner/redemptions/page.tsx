import { Receipt } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getPartnerRedemptions } from "@/server/rewards/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import {
  RedemptionStatusBadge,
  RewardTypeBadge,
} from "@/components/domain/reward-type-badge";
import { TokenAmount } from "@/components/domain/token-amount";
import { PartnerIssueButton } from "@/components/domain/partner-issue-button";
import { formatRewardDateTime, userDisplay } from "@/lib/rewards";

export default async function PartnerRedemptionsPage() {
  const user = await requireUser();
  const items = await getPartnerRedemptions(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Выкупы наград"
        description="Кто и когда обменял ваши награды."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Пока нет выкупов"
          description="Здесь появятся обмены ваших наград волонтёрами."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RewardTypeBadge type={r.reward.type} />
                  <RedemptionStatusBadge status={r.status} />
                </div>
                <h3 className="font-bold tracking-[-0.01em]">{r.reward.title}</h3>
                <p className="text-xs text-muted">
                  {userDisplay(r.user)} · {formatRewardDateTime(r.purchasedAt)}
                </p>
                {r.code && (
                  <p className="tabular text-sm font-bold tracking-[0.06em] text-foreground">
                    Код: {r.code}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                <TokenAmount value={r.costTokens} sign="neutral" withIcon />
                {r.status === "APPROVED" && (
                  <PartnerIssueButton redemptionId={r.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
