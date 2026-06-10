import { Coins, ArrowDownLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getBalance } from "@/server/tokens/ledger";
import { formatTokens } from "@/lib/utils";
import { PageHeader } from "@/components/layout/page-header";
import { WalletHistory } from "@/components/domain/wallet-history";

export default async function WalletPage() {
  const user = await requireUser();
  // Баланс — источник истины из леджера (на случай рассинхрона кэша).
  const balance = await getBalance(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Кошелёк"
        description="Баланс и история начислений Social Tokens."
      />

      {/* ПК (≥lg): слева «липкая» карточка счёта, справа широкая выписка.
          Телефон/планшет (<lg): одна колонка стопкой. */}
      <div className="lg:grid lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-6">
        {/* Карточка счёта — банковский вид. */}
        <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm lg:sticky lg:top-20">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <span className="text-sm font-semibold text-muted">
              Доступный баланс
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-2 py-1 text-xs font-bold text-warning-strong ring-1 ring-inset ring-warning-strong/15">
              <Coins className="size-3.5 text-tokens" weight="duotone" aria-hidden />
              токены
            </span>
          </div>
          <div className="flex items-baseline gap-2 px-5 py-6">
            <span className="tabular text-5xl font-extrabold tracking-[-0.03em]">
              {formatTokens(balance)}
            </span>
            <span className="text-base font-semibold text-muted">токенов</span>
          </div>
          <p className="border-t border-border px-5 py-3 text-xs leading-relaxed text-muted">
            Токены начисляются за участие в мероприятиях, выполнение заданий и
            заполнение профиля. Тратятся в маркетплейсе наград.
          </p>
        </section>

        {/* История операций — банковская выписка со sticky-заголовком. */}
        <section className="mt-6 space-y-3 lg:mt-0">
          <div className="sticky top-14 z-10 -mx-4 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-4 py-2.5 backdrop-blur-sm md:mx-0 md:rounded-sm md:border md:px-3">
            <h2 className="text-sm font-bold tracking-[-0.01em]">
              История операций
            </h2>
            <div className="flex items-center gap-3 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-muted">
              <span className="inline-flex items-center gap-1">
                <ArrowDownLeft
                  className="size-3.5 text-tokens-plus"
                  weight="bold"
                  aria-hidden
                />
                начисление
              </span>
              <span className="inline-flex items-center gap-1">
                <ArrowUpRight
                  className="size-3.5 text-tokens-minus"
                  weight="bold"
                  aria-hidden
                />
                списание
              </span>
            </div>
          </div>
          <WalletHistory />
        </section>
      </div>
    </div>
  );
}
