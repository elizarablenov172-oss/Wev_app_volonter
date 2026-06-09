import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
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

interface TxTypeMeta {
  label: string;
  variant: "primary" | "success" | "warning" | "danger" | "muted";
}

const TYPE_META: Record<string, TxTypeMeta> = {
  EARN_EVENT: { label: "Мероприятие", variant: "primary" },
  EARN_PROFILE: { label: "Профиль", variant: "success" },
  EARN_MISSION: { label: "Задание", variant: "primary" },
  EARN_BONUS: { label: "Бонус", variant: "success" },
  SPEND_REWARD: { label: "Награда", variant: "danger" },
  REFUND: { label: "Возврат", variant: "warning" },
  ADMIN_ADJUST: { label: "Корректировка", variant: "muted" },
};

export interface WalletHistoryRowProps {
  tx: WalletTransaction;
}

/** Строка истории операций: причина, дата, бейдж типа и сумма со знаком. */
export function WalletHistoryRow({ tx }: WalletHistoryRowProps) {
  const meta = TYPE_META[tx.type] ?? { label: tx.type, variant: "muted" as const };
  const sign = tx.amount < 0 ? "minus" : "plus";

  let dateLabel = "";
  const parsed = new Date(tx.createdAt);
  if (!Number.isNaN(parsed.getTime())) {
    dateLabel = format(parsed, "d MMM yyyy, HH:mm", { locale: ru });
  }

  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-b-0">
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-sm font-semibold text-foreground">
          {tx.reason}
        </p>
        <div className="flex items-center gap-2">
          <Badge variant={meta.variant}>{meta.label}</Badge>
          {dateLabel && (
            <time dateTime={tx.createdAt} className="text-xs text-muted">
              {dateLabel}
            </time>
          )}
        </div>
      </div>
      <TokenAmount
        value={tx.amount}
        sign={sign}
        withIcon
        className="shrink-0"
      />
    </div>
  );
}
