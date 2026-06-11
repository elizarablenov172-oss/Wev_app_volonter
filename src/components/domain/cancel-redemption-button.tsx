"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/domain/confirm-dialog";

/** Кнопка отмены заявки/покупки с возвратом токенов (для волонтёра). */
export function CancelRedemptionButton({ redemptionId }: { redemptionId: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function cancel() {
    setBusy(true);
    try {
      const res = await fetch(`/api/rewards/redemptions/${redemptionId}/cancel`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось отменить");
      toast.success("Заявка отменена — токены возвращены");
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка отмены");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Отменить
      </Button>
      <ConfirmDialog
        open={open}
        title="Отменить заявку?"
        description="Зарезервированные токены вернутся на ваш баланс."
        confirmLabel="Отменить заявку"
        confirmVariant="danger"
        busy={busy}
        onConfirm={cancel}
        onCancel={() => setOpen(false)}
      />
    </>
  );
}
