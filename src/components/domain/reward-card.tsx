import Link from "next/link";
import {
  Storefront,
  Package,
  Clock,
  ArrowRight,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { TokenAmount } from "@/components/domain/token-amount";
import { RewardTypeBadge } from "@/components/domain/reward-type-badge";
import {
  formatRewardDate,
  rewardTypeLabel,
  type RewardListItem,
} from "@/lib/rewards";

interface RewardCardProps {
  reward: RewardListItem;
  /** Баланс зрителя (для подписи «не хватает N»). null — гость. */
  balance: number | null;
}

/**
 * Карточка награды для каталога волонтёра. Вся карточка — ссылка на детали.
 * Обложка-плейсхолдер с инициалом типа, тип-бейдж, партнёр, название,
 * цена в токенах, наличие/срок и CTA («Обменять» / «Оформить заявку»).
 * Если цена выше баланса — подпись «не хватает N» вместо CTA.
 */
export function RewardCard({ reward, balance }: RewardCardProps) {
  const outOfStock = !reward.inStock;
  const affordable = balance == null ? true : balance >= reward.costTokens;
  const shortfall =
    balance == null ? 0 : Math.max(0, reward.costTokens - balance);

  return (
    <Link
      href={`/marketplace/${reward.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-md border border-border bg-surface shadow-xs transition-[border-color,box-shadow] hover:border-border-strong hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
    >
      {/* Обложка: либо картинка партнёра, либо мягкий плейсхолдер с инициалом типа. */}
      <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-primary-soft to-surface-muted">
        {reward.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={reward.imageUrl}
            alt=""
            className="size-full object-cover"
            loading="lazy"
          />
        ) : (
          <span
            className="text-4xl font-black tracking-[-0.04em] text-primary/30 select-none"
            aria-hidden
          >
            {rewardTypeLabel(reward.type).charAt(0).toUpperCase()}
          </span>
        )}
        <RewardTypeBadge type={reward.type} className="absolute left-3 top-3" />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {reward.partner && (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted">
            <Storefront className="size-3.5 shrink-0" weight="duotone" aria-hidden />
            <span className="truncate">{reward.partner.brandName}</span>
          </span>
        )}

        <h3 className="line-clamp-2 text-base font-bold leading-snug tracking-[-0.02em] text-foreground">
          {reward.title}
        </h3>

        <dl className="space-y-1.5 text-sm text-muted">
          <div className="flex items-center gap-2">
            <Package className="size-4 shrink-0" weight="duotone" aria-hidden />
            <dd className={outOfStock ? "font-semibold text-danger-strong" : "truncate"}>
              {outOfStock
                ? "Нет в наличии"
                : reward.stock == null
                  ? "В наличии"
                  : `Осталось: ${reward.stock}`}
            </dd>
          </div>
          {reward.expiresAt && (
            <div className="flex items-center gap-2">
              <Clock className="size-4 shrink-0" weight="duotone" aria-hidden />
              <dd className="truncate">до {formatRewardDate(reward.expiresAt)}</dd>
            </div>
          )}
        </dl>

        {/* Подвал: цена + CTA-подсказка / «не хватает N». */}
        <div className="mt-auto flex items-center justify-between gap-2 border-t border-border pt-3">
          <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 ring-1 ring-inset ring-warning-strong/15">
            <TokenAmount value={reward.costTokens} sign="neutral" withIcon />
          </span>

          {outOfStock ? (
            <span className="text-sm font-semibold text-muted">Недоступно</span>
          ) : !affordable ? (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-danger-strong">
              <WarningCircle className="size-4" weight="duotone" aria-hidden />
              не хватает {shortfall}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm font-semibold text-primary">
              {reward.requiresApproval ? "Заявка" : "Обменять"}
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-0.5"
                weight="bold"
                aria-hidden
              />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
