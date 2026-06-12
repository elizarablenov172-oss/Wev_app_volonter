"use client";

import * as React from "react";
import { Wallet } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncResource } from "@/lib/use-async-resource";
import {
  WalletHistoryRow,
  type WalletTransaction,
} from "./wallet-history-row";
import { EmptyState } from "./empty-state";

/**
 * Клиентский список истории операций (GET /api/wallet/history).
 * Состояния: loading / error / empty / list.
 */
export function WalletHistory() {
  const loader = React.useCallback(
    async (signal: AbortSignal): Promise<WalletTransaction[]> => {
      const res = await fetch("/api/wallet/history", {
        credentials: "same-origin",
        cache: "no-store",
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось загрузить историю");
      }
      return (data.transactions ?? []) as WalletTransaction[];
    },
    [],
  );

  const state = useAsyncResource(loader, "wallet-history");

  if (state.status === "loading") {
    return (
      <Card className="divide-y divide-border">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3.5">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </Card>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <p className="py-6 text-center text-sm text-danger-strong">
          {state.message}
        </p>
      </Card>
    );
  }

  if (state.data.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Операций пока нет"
        description="Участвуйте в мероприятиях и заданиях, заполняйте профиль — начисления появятся здесь."
      />
    );
  }

  return (
    <Card className="divide-y divide-border overflow-hidden">
      {state.data.map((tx) => (
        <WalletHistoryRow key={tx.id} tx={tx} />
      ))}
    </Card>
  );
}
