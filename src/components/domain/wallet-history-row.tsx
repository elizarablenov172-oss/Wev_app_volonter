import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { ArrowDownLeft, ArrowUpRight } from "@phosphor-icons/react/dist/ssr";
import { TokenAmount } from "./token-amount";

/** Тип транзакции (Prisma TxType). */
type TxType =
  | "EARN_EVENT"
  | "EARN_PROFILE"
  | "EARN_MISSION"
  | "EARN_BONUS"
  | "SPEND_REWARD"
  | "REFUND"
  | "ADMIN_ADJUST";

/** Транзакция в форме из API /api/wallet/history. */
export interface WalletTransaction {
  id: string;
  amount: number;
  type: TxType | string;
  reason: string;
  refType: string | null;
  refId: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = {
  EARN_EVENT: "Мероприятие",
  EARN_PROFILE: "Профиль",
  EARN_MISSION: "Задание",
  EARN_BONUS: "Бонус",
  SPEND_REWARD: "Награда",
  REFUND: "Возврат",
  ADMIN_ADJUST: "Корректировка",
};

export interface WalletHistoryRowProps {
  tx: WalletTransaction;
}

/**
 * Строка выписки: направленная иконка, причина + категория · дата, сумма ±.
 * Цвет иконки/суммы по знаку, моноширинные цифры выровнены по правому краю.
 */
export function WalletHistoryRow({ tx }: WalletHistoryRowProps) {
  const isMinus = tx.amount < 0;
  const label = TYPE_LABEL[tx.type] ?? tx.type;

  let dateLabel = "";
  const parsed = new Date(tx.createdAt);
  if (!Number.isNaN(parsed.getTime())) {
    dateLabel = format(parsed, "d MMM yyyy, HH:mm", { locale: ru });
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-muted/60">
      {/* Направленная иконка операции: soft-фон + затемнённая иконка (контраст AA). */}
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-sm ring-1 ring-inset ${
          isMinus
            ? "bg-danger-soft text-tokens-minus ring-danger-strong/15"
            : "bg-success-soft text-tokens-plus ring-success-strong/15"
        }`}
        aria-hidden
      >
        {isMinus ? (
          <ArrowUpRight className="size-[1.125rem]" weight="bold" />
        ) : (
          <ArrowDownLeft className="size-[1.125rem]" weight="bold" />
        )}
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {tx.reason}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted">
          {label}
          {dateLabel && (
            <>
              {" · "}
              <time dateTime={tx.createdAt}>{dateLabel}</time>
            </>
          )}
        </p>
      </div>

      <TokenAmount
        value={tx.amount}
        sign={isMinus ? "minus" : "plus"}
        className="shrink-0 text-sm"
      />
    </div>
  );
}
