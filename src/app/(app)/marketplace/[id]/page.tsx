import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft, Storefront } from "@phosphor-icons/react/dist/ssr";
import { getCurrentUser } from "@/server/auth";
import { getRewardDetail } from "@/server/rewards/queries";
import { RewardTypeBadge } from "@/components/domain/reward-type-badge";
import { RewardPurchasePanel } from "@/components/domain/reward-purchase-panel";

export default async function RewardDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await getRewardDetail(id, user?.id ?? null);
  if (!data) notFound();

  const { reward, balance, myRedemptions } = data;
  const isVolunteer = user?.role === "VOLUNTEER";

  const panel = (
    <RewardPurchasePanel
      reward={reward}
      initialBalance={balance}
      initialMyRedemptions={myRedemptions}
      isVolunteer={isVolunteer}
      isAuthenticated={Boolean(user)}
    />
  );

  return (
    <div className="space-y-5">
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К каталогу
      </Link>

      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start lg:gap-6">
        {/* Контент */}
        <div className="space-y-5">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <RewardTypeBadge type={reward.type} />
              {reward.partner && (
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted">
                  <Storefront className="size-4" weight="duotone" aria-hidden />
                  {reward.partner.brandName}
                </span>
              )}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-[-0.02em] lg:text-3xl">
              {reward.title}
            </h1>
          </div>

          {reward.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={reward.imageUrl}
              alt=""
              className="max-h-80 w-full rounded-lg border border-border object-cover"
            />
          )}

          <section className="rounded-lg border border-border bg-surface shadow-xs">
            <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              Описание
            </h2>
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-foreground">
              {reward.description}
            </p>
          </section>

          {reward.conditions && (
            <section className="rounded-lg border border-border bg-surface shadow-xs">
              <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                Условия получения
              </h2>
              <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-foreground">
                {reward.conditions}
              </p>
            </section>
          )}

          {reward.partner?.description && (
            <section className="rounded-lg border border-border bg-surface shadow-xs">
              <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
                О партнёре
              </h2>
              <p className="px-5 py-4 text-sm leading-relaxed text-foreground">
                {reward.partner.description}
              </p>
            </section>
          )}

          {/* Панель покупки на телефоне/планшете — встроенно (на ПК она в правой колонке). */}
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm lg:hidden">
            {panel}
          </div>
        </div>

        {/* Покупка — липкая правая колонка (≥lg) */}
        <aside className="hidden lg:sticky lg:top-20 lg:block">
          <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
            {panel}
          </div>
        </aside>
      </div>
    </div>
  );
}
