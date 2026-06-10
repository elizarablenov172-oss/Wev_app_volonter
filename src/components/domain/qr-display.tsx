"use client";

import * as React from "react";
import { QRCodeSVG } from "qrcode.react";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";

interface QrDisplayProps {
  eventId: string;
}

interface QrData {
  eventId: string;
  title: string;
  qrSecret: string;
  payload: string;
}

/**
 * Крупный QR-код чек-ина для показа на месте проведения.
 * Тянет payload через GET /api/org/events/[id]/qr (ленивая генерация секрета
 * на сервере) и кодирует его в QR (qrcode.react). Волонтёр сканирует его на
 * странице чек-ина.
 */
export function QrDisplay({ eventId }: QrDisplayProps) {
  const [data, setData] = React.useState<QrData | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/org/events/${eventId}/qr`, {
          credentials: "same-origin",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json?.error ?? "Не удалось получить QR-код");
        if (active) setData(json as QrData);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Ошибка загрузки QR");
      }
    })();
    return () => {
      active = false;
    };
  }, [eventId]);

  if (error) {
    return (
      <Card className="flex flex-col items-center gap-2 p-8 text-center">
        <WarningCircle className="size-8 text-danger" weight="duotone" aria-hidden />
        <p className="text-sm font-medium text-danger-strong">{error}</p>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card className="flex flex-col items-center gap-3 p-12 text-center text-muted">
        <CircleNotch className="size-7 animate-spin" weight="bold" aria-hidden />
        <p className="text-sm">Генерируем QR-код…</p>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col items-center gap-5 p-6 sm:p-8">
      <div className="rounded-md border border-border bg-white p-4">
        <QRCodeSVG
          value={data.payload}
          size={256}
          level="M"
          marginSize={2}
          className="size-56 sm:size-64"
        />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-muted">Код мероприятия</p>
        <p className="mt-1 break-all rounded-sm bg-surface-muted px-3 py-1.5 font-mono text-xs text-foreground">
          {data.qrSecret}
        </p>
        <p className="mt-2 max-w-xs text-xs text-muted">
          Если у волонтёра нет камеры — он может ввести этот код вручную на странице
          чек-ина.
        </p>
      </div>
    </Card>
  );
}
