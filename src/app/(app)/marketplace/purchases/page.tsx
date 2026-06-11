import Link from "next/link";
import { Receipt } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getUserPurchases } from "@/server/rewards/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import {
  RedemptionStatusBadge,
  RewardTypeBadge,
} from "@/components/domain/reward-type-badge";
import { TokenAmount } from "@/components/domain/token-amount";
import { CancelRedemptionButton } from "@/components/domain/cancel-redemption-button";
import { formatRewardDateTime, canCancelRedemption } from "@/lib/rewards";

export default async function PurchasesPage() {
  const user = await requireUser();
  const items = await getUserPurchases(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои покупки"
        description="История обменов и заявок на награды."
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Пока пусто"
          description="Обменяйте токены на награды в маркетплейсе."
          action={
            <Link href="/marketplace" className="text-sm font-semibold text-primary">
              Открыть маркетплейс →
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li
              key={p.id}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <RewardTypeBadge type={p.reward.type} />
                  <RedemptionStatusBadge status={p.status} />
                </div>
                <h3 className="font-bold tracking-[-0.01em]">{p.reward.title}</h3>
                <p className="text-xs text-muted">
                  {p.reward.partner?.brandName ? `${p.reward.partner.brandName} · ` : ""}
                  {formatRewardDateTime(p.purchasedAt)}
                </p>
                {p.code && (
                  <p className="tabular text-sm font-extrabold tracking-[0.06em] text-success-strong">
                    Код выдачи: {p.code}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 items-center justify-between gap-3 sm:flex-col sm:items-end">
                <TokenAmount value={p.costTokens} sign="minus" withIcon />
                {canCancelRedemption(p.status) && (
                  <CancelRedemptionButton redemptionId={p.id} />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
