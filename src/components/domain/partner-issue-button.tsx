"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { CircleNotch, SealCheck } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Кнопка «Отметить выданным» для выкупа по награде партнёра. */
export function PartnerIssueButton({ redemptionId }: { redemptionId: string }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);

  async function issue() {
    setBusy(true);
    try {
      const res = await fetch(`/api/partner/redemptions/${redemptionId}/issue`, {
        method: "POST",
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Не удалось отметить");
      toast.success("Отмечено как выдано");
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={issue} disabled={busy}>
      {busy ? (
        <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
      ) : (
        <SealCheck className="size-4" weight="duotone" aria-hidden />
      )}
      Отметить выданным
    </Button>
  );
}
