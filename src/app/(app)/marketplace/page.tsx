import Link from "next/link";
import { Storefront, Receipt } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getRewardCatalog, type RewardCatalogFilters } from "@/server/rewards/queries";
import { PageHeader } from "@/components/layout/page-header";
import { BalanceChip } from "@/components/domain/balance-chip";
import { RewardCard } from "@/components/domain/reward-card";
import { RewardFilterBar } from "@/components/domain/reward-filter-bar";
import { EmptyState } from "@/components/domain/empty-state";
import type { RewardType } from "@/lib/rewards";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const typeStr = one(sp.type);
  const maxCostStr = one(sp.maxCost);
  const sortStr = one(sp.sort);

  const filters: RewardCatalogFilters = {
    type: typeStr ? (typeStr as RewardType) : undefined,
    maxCost:
      maxCostStr && !Number.isNaN(Number(maxCostStr)) ? Number(maxCostStr) : undefined,
    sort: sortStr === "cost_asc" || sortStr === "cost_desc" ? sortStr : "new",
  };

  const { items, balance } = await getRewardCatalog(filters, user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Маркетплейс наград"
        description="Обменивайте Social Tokens на награды от партнёров."
        actions={
          <div className="flex items-center gap-2">
            <Link
              href="/marketplace/purchases"
              className="inline-flex h-10 items-center gap-1.5 rounded-sm border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-xs transition-colors hover:bg-surface-muted"
            >
              <Receipt className="size-4 text-muted" weight="duotone" aria-hidden />
              Покупки
            </Link>
            <BalanceChip value={balance ?? user.cachedBalance} size="lg" />
          </div>
        }
      />

      <RewardFilterBar
        initialType={typeStr}
        initialMaxCost={maxCostStr}
        initialSort={sortStr}
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Storefront}
          title="Награды не найдены"
          description="Попробуйте изменить фильтры каталога."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((r) => (
            <RewardCard key={r.id} reward={r} balance={balance} />
          ))}
        </div>
      )}
    </div>
  );
}
