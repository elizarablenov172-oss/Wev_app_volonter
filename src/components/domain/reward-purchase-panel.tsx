"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Coins,
  Package,
  Clock,
  SealCheck,
  Ticket,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TokenAmount } from "@/components/domain/token-amount";
import { RedemptionStatusBadge } from "@/components/domain/reward-type-badge";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";
import {
  formatRewardDate,
  formatRewardDateTime,
  isIssued,
  type RewardDetail,
  type MyRedemption,
} from "@/lib/rewards";

interface RewardPurchasePanelProps {
  reward: RewardDetail;
  initialBalance: number | null;
  initialMyRedemptions: MyRedemption[] | null;
  /** Покупать может только волонтёр. */
  isVolunteer: boolean;
  /** Авторизован ли зритель. */
  isAuthenticated: boolean;
  /** Компактный режим для sticky-бара на телефоне. */
  compact?: boolean;
}

/**
 * Карточка покупки/резерва награды для детальной страницы.
 * CTA по флагу requiresApproval: «Обменять» (redeem → код сразу) либо
 * «Оформить заявку» (reserve → PENDING_APPROVAL). Подтверждение через диалог
 * (списать N токенов). 402 → тост «недостаточно токенов». После успеха —
 * код выдачи и обновление списка покупок.
 */
export function RewardPurchasePanel({
  reward,
  initialBalance,
  initialMyRedemptions,
  isVolunteer,
  isAuthenticated,
  compact = false,
}: RewardPurchasePanelProps) {
  const router = useRouter();
  const [balance, setBalance] = React.useState<number | null>(initialBalance);
  const [redemptions, setRedemptions] = React.useState<MyRedemption[]>(
    initialMyRedemptions ?? [],
  );
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  const affordable = balance == null ? false : balance >= reward.costTokens;
  const shortfall =
    balance == null ? reward.costTokens : Math.max(0, reward.costTokens - balance);

  // Активная (не отменённая) выдача с кодом — показываем «уже у вас».
  const issuedOne = redemptions.find((r) => isIssued(r.status) && r.code);
  const pendingOne = redemptions.find((r) => r.status === "PENDING_APPROVAL");

  async function handlePurchase() {
    setSubmitting(true);
    const endpoint = reward.requiresApproval ? "reserve" : "redeem";
    try {
      const res = await fetch(`/api/rewards/${reward.id}/${endpoint}`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 402 || data?.code === "INSUFFICIENT_TOKENS") {
          throw new Error("Недостаточно токенов для этой награды");
        }
        throw new Error(data?.error ?? "Не удалось оформить награду");
      }

      const redemption = data.redemption as MyRedemption;
      setRedemptions((prev) => [redemption, ...prev]);
      if (typeof data.balance === "number") setBalance(data.balance);

      if (reward.requiresApproval) {
        toast.success("Заявка создана — ожидайте решения администратора");
      } else {
        toast.success(
          redemption.code
            ? `Награда оформлена · код ${redemption.code}`
            : "Награда оформлена",
        );
      }
      setConfirmOpen(false);
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка покупки");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── CTA-блок (зависит от состояния) ───
  let cta: React.ReactNode;

  if (!isAuthenticated) {
    cta = (
      <Link href="/login" className="block">
        <Button className="w-full" size="lg">
          Войти, чтобы обменять
        </Button>
      </Link>
    );
  } else if (!isVolunteer) {
    cta = (
      <p className="rounded-sm bg-surface-muted px-3 py-2.5 text-center text-sm font-medium text-muted">
        Обменивать токены на награды может только волонтёр.
      </p>
    );
  } else if (!reward.available) {
    cta = (
      <Button className="w-full" size="lg" disabled>
        {reward.expired
          ? "Срок действия истёк"
          : !reward.inStock
            ? "Нет в наличии"
            : "Награда недоступна"}
      </Button>
    );
  } else if (!affordable) {
    cta = (
      <div className="space-y-2">
        <Button className="w-full" size="lg" disabled>
          Не хватает {shortfall} токенов
        </Button>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted">
          <WarningCircle className="size-4 shrink-0" weight="duotone" aria-hidden />
          Участвуйте в мероприятиях и заданиях, чтобы накопить токены.
        </p>
      </div>
    );
  } else {
    cta = (
      <Button
        className="w-full"
        size="lg"
        onClick={() => setConfirmOpen(true)}
        disabled={submitting}
      >
        {submitting && (
          <CircleNotch className="size-5 animate-spin" weight="bold" aria-hidden />
        )}
        {reward.requiresApproval ? "Оформить заявку" : "Обменять на токены"}
      </Button>
    );
  }

  // ─── Компактный sticky-бар (телефон) ───
  if (compact) {
    return (
      <>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <Coins className="size-4 shrink-0 text-tokens" weight="duotone" aria-hidden />
              <span className="tabular text-sm font-bold">
                {reward.costTokens} токенов
              </span>
            </div>
            <p className="truncate text-xs text-muted">
              {reward.requiresApproval ? "По заявке" : "Сразу после обмена"}
            </p>
          </div>
          <div className="w-1/2 shrink-0">{cta}</div>
        </div>
        {renderConfirm()}
      </>
    );
  }

  return (
    <div className="space-y-4">
      {balance != null && (
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="font-semibold text-muted">Ваш баланс</span>
          <TokenAmount value={balance} sign="neutral" withIcon />
        </div>
      )}

      {/* Цена — крупно. */}
      <div className="rounded-md bg-warning-soft px-4 py-4 ring-1 ring-inset ring-warning-strong/15">
        <p className="text-xs font-semibold uppercase tracking-[0.04em] text-warning-strong">
          Стоимость обмена
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <Coins className="size-6 self-center text-tokens" weight="duotone" aria-hidden />
          <span className="tabular text-3xl font-extrabold tracking-[-0.03em] text-warning-strong">
            {reward.costTokens}
          </span>
          <span className="text-sm font-semibold text-warning-strong">токенов</span>
        </div>
      </div>

      {/* Наличие/срок. */}
      <dl className="space-y-2.5 text-sm">
        <div className="flex items-center justify-between gap-3">
          <dt className="inline-flex items-center gap-2 text-muted">
            <Package className="size-4" weight="duotone" aria-hidden />
            Наличие
          </dt>
          <dd className={`font-bold ${reward.inStock ? "text-foreground" : "text-danger-strong"}`}>
            {!reward.inStock
              ? "Нет в наличии"
              : reward.stock == null
                ? "Без ограничений"
                : `${reward.stock} шт.`}
          </dd>
        </div>
        {reward.expiresAt && (
          <div className="flex items-center justify-between gap-3">
            <dt className="inline-flex items-center gap-2 text-muted">
              <Clock className="size-4" weight="duotone" aria-hidden />
              Действует до
            </dt>
            <dd className={`text-right font-semibold ${reward.expired ? "text-danger-strong" : "text-foreground"}`}>
              {formatRewardDate(reward.expiresAt)}
            </dd>
          </div>
        )}
      </dl>

      <div className="border-t border-border pt-4">{cta}</div>

      {/* Уже выдано — показываем код. */}
      {issuedOne && (
        <div className="rounded-md bg-success-soft px-4 py-3 ring-1 ring-inset ring-success-strong/15">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-success-strong">
            <SealCheck className="size-5" weight="fill" aria-hidden />
            Награда уже у вас
          </p>
          <p className="mt-1.5 text-xs font-semibold uppercase tracking-[0.04em] text-success-strong/80">
            Код выдачи
          </p>
          <p className="tabular mt-0.5 text-lg font-extrabold tracking-[0.06em] text-success-strong">
            {issuedOne.code}
          </p>
        </div>
      )}

      {!issuedOne && pendingOne && (
        <div className="rounded-md bg-warning-soft px-4 py-3 ring-1 ring-inset ring-warning-strong/15">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-warning-strong">
            <Ticket className="size-5" weight="duotone" aria-hidden />
            Заявка на одобрении
          </p>
          <p className="mt-1 text-xs text-warning-strong/90">
            Токены зарезервированы. После решения администратора появится код выдачи.
          </p>
        </div>
      )}

      {/* История покупок по этой награде. */}
      {redemptions.length > 0 && (
        <div className="border-t border-border pt-4">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.04em] text-muted">
            Ваши обмены этой награды
          </h3>
          <ul className="space-y-2">
            {redemptions.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-sm bg-surface-muted/60 px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <RedemptionStatusBadge status={r.status} />
                    {r.code && (
                      <span className="tabular truncate font-bold tracking-[0.04em] text-foreground">
                        {r.code}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted">
                    {formatRewardDateTime(r.purchasedAt)}
                  </p>
                </div>
                <TokenAmount value={r.costTokens} sign="minus" />
              </li>
            ))}
          </ul>
        </div>
      )}

      {renderConfirm()}
    </div>
  );

  function renderConfirm() {
    return (
      <ConfirmDialog
        open={confirmOpen}
        title={
          reward.requiresApproval ? "Оформить заявку на награду?" : "Обменять токены?"
        }
        description={
          <span>
            С вашего баланса будет списано{" "}
            <span className="font-bold text-foreground">{reward.costTokens} токенов</span>{" "}
            за «{reward.title}».
            {reward.requiresApproval
              ? " Токены резервируются до решения администратора — при отклонении вернутся."
              : " Код выдачи появится сразу после обмена."}
          </span>
        }
        confirmLabel={reward.requiresApproval ? "Отправить заявку" : "Обменять"}
        busy={submitting}
        onConfirm={handlePurchase}
        onCancel={() => setConfirmOpen(false)}
      />
    );
  }
}
