import { Coins } from "lucide-react";
import { requireUser } from "@/server/auth";
import { getBalance } from "@/server/tokens/ledger";
import { formatTokens } from "@/lib/utils";
import { WalletHistory } from "@/components/domain/wallet-history";

export default async function WalletPage() {
  const user = await requireUser();
  // Баланс — источник истины из леджера (на случай рассинхрона кэша).
  const balance = await getBalance(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Кошелёк</h1>

      {/* Баланс — крупно, янтарь как фон+иконка, текст тёмный (контраст AA). */}
      <div className="overflow-hidden rounded-xl border border-warning/30 bg-warning-soft p-6 shadow-sm">
        <p className="text-sm font-semibold text-warning-strong">
          Текущий баланс
        </p>
        <div className="mt-2 flex items-center gap-3">
          <span
            className="flex size-12 items-center justify-center rounded-full bg-warning/30 text-warning-strong"
            aria-hidden
          >
            <Coins className="size-7" />
          </span>
          <div className="flex items-baseline gap-2">
            <span className="tabular text-4xl font-extrabold text-warning-strong">
              {formatTokens(balance)}
            </span>
            <span className="text-lg font-bold text-warning-strong">
              токенов
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="text-lg font-bold">История операций</h2>
        <WalletHistory />
      </div>
    </div>
  );
}
