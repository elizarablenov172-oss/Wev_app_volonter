import Link from "next/link";
import { Plus, Gift } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getPartnerRewards } from "@/server/rewards/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { RewardTypeBadge } from "@/components/domain/reward-type-badge";
import { TokenAmount } from "@/components/domain/token-amount";
import { formatRewardDate } from "@/lib/rewards";

export default async function PartnerRewardsPage() {
  const user = await requireUser();
  const items = await getPartnerRewards(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мои награды"
        description="Награды вашего бренда в маркетплейсе."
        actions={
          <Link href="/partner/rewards/new">
            <Button>
              <Plus className="size-4" weight="bold" aria-hidden />
              Создать
            </Button>
          </Link>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Gift}
          title="Пока нет наград"
          description="Создайте первую награду — волонтёры смогут обменять на неё токены."
          action={
            <Link href="/partner/rewards/new">
              <Button>Создать награду</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((r) => (
            <Link
              key={r.id}
              href={`/partner/rewards/${r.id}/edit`}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-2">
                <RewardTypeBadge type={r.type} />
                {!r.isActive && <Badge variant="muted">Скрыта</Badge>}
              </div>
              <h3 className="line-clamp-2 font-bold tracking-[-0.01em]">{r.title}</h3>
              <dl className="mt-auto space-y-1 border-t border-border pt-3 text-sm text-muted">
                <div className="flex items-center justify-between">
                  <dt>Цена</dt>
                  <dd>
                    <TokenAmount value={r.costTokens} sign="neutral" />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Наличие</dt>
                  <dd className="font-semibold text-foreground">
                    {r.stock == null ? "Без лимита" : `${r.stock} шт.`}
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Выкупов</dt>
                  <dd className="tabular font-semibold text-foreground">
                    {r.redemptionsCount}
                  </dd>
                </div>
                {r.expiresAt && (
                  <div className="flex items-center justify-between">
                    <dt>Действует до</dt>
                    <dd>{formatRewardDate(r.expiresAt)}</dd>
                  </div>
                )}
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
