"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Icon } from "@phosphor-icons/react";
import {
  QrCode,
  MapPin,
  SealCheck,
  CircleNotch,
  Coins,
} from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { QrScanner } from "@/components/domain/qr-scanner";

interface CheckinFlowProps {
  eventId: string;
  eventTitle: string;
  /** Доступен ли гео-чек-ин (у события заданы координаты). */
  geoEnabled: boolean;
}

type Tab = "qr" | "geo";

interface CheckinError {
  message: string;
  distanceMeters?: number;
  radiusMeters?: number;
}

/**
 * Клиентский флоу чек-ина: вкладки «QR» и «Геолокация».
 * QR → сканер/ручной ввод секрета → POST {method:'QR',qrSecret}.
 * GEO → navigator.geolocation → POST {method:'GEO',lat,lng}.
 * Успех → экран «Участие подтверждено, +N токенов» (toast + редирект на событие).
 */
export function CheckinFlow({ eventId, eventTitle, geoEnabled }: CheckinFlowProps) {
  const router = useRouter();
  const [tab, setTab] = React.useState<Tab>("qr");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<CheckinError | null>(null);
  const [awarded, setAwarded] = React.useState<number | null>(null);

  async function submitCheckin(
    body: { method: "QR"; qrSecret: string } | { method: "GEO"; lat: number; lng: number },
  ) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/checkin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError({
          message: data?.error ?? "Не удалось пройти чек-ин",
          distanceMeters: data?.distanceMeters,
          radiusMeters: data?.radiusMeters,
        });
        return;
      }

      const earned = typeof data?.awarded === "number" ? data.awarded : 0;
      setAwarded(earned);
      if (earned > 0) toast.success(`Участие подтверждено! +${earned} токенов`);
      else toast.success("Участие подтверждено!");

      // Дать пользователю увидеть успех, затем вернуть на событие.
      router.refresh();
      window.setTimeout(() => {
        router.push(`/events/${eventId}`);
      }, 1800);
    } catch {
      setError({ message: "Сеть недоступна. Попробуйте ещё раз." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleGeo() {
    setError(null);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError({ message: "Геолокация не поддерживается этим устройством." });
      return;
    }
    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        void submitCheckin({
          method: "GEO",
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
      },
      (geoErr) => {
        setSubmitting(false);
        const message =
          geoErr.code === geoErr.PERMISSION_DENIED
            ? "Доступ к геолокации запрещён. Разрешите доступ или используйте QR-код."
            : "Не удалось определить местоположение. Попробуйте ещё раз.";
        setError({ message });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  }

  // ─── Экран успеха ───
  if (awarded !== null) {
    return (
      <Card className="flex flex-col items-center gap-4 p-8 text-center">
        <span
          className="flex size-16 items-center justify-center rounded-full bg-success-soft text-success-strong ring-1 ring-inset ring-success-strong/15"
          aria-hidden
        >
          <SealCheck className="size-9" weight="fill" />
        </span>
        <div className="space-y-1">
          <h2 className="text-xl font-bold tracking-[-0.02em]">Участие подтверждено!</h2>
          <p className="text-sm text-muted">«{eventTitle}»</p>
        </div>
        {awarded > 0 && (
          <p className="inline-flex items-center gap-1.5 rounded-sm bg-warning-soft px-3 py-1.5 text-base font-bold text-warning-strong ring-1 ring-inset ring-warning-strong/15">
            <Coins className="size-5 text-tokens" weight="duotone" aria-hidden />
            +{awarded} токенов
          </p>
        )}
        <p className="text-sm text-muted">Возвращаем на страницу мероприятия…</p>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Вкладки QR / Гео. */}
      <div
        className="grid grid-cols-2 border-b border-border"
        role="tablist"
        aria-label="Способ чек-ина"
      >
        <TabButton active={tab === "qr"} onClick={() => setTab("qr")} icon={QrCode}>
          QR-код
        </TabButton>
        <TabButton active={tab === "geo"} onClick={() => setTab("geo")} icon={MapPin}>
          Геолокация
        </TabButton>
      </div>

      <div className="p-5">
        {error && (
          <div className="mb-4 rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-medium text-danger-strong ring-1 ring-inset ring-danger-strong/15">
            <p>{error.message}</p>
            {error.distanceMeters != null && error.radiusMeters != null && (
              <p className="mt-1 text-xs">
                Вы примерно в {error.distanceMeters} м, нужно быть ближе {error.radiusMeters} м.
              </p>
            )}
          </div>
        )}

        {tab === "qr" ? (
          <QrScanner
            busy={submitting}
            onResult={(qrSecret) => void submitCheckin({ method: "QR", qrSecret })}
          />
        ) : (
          <div className="space-y-4">
            {geoEnabled ? (
              <>
                <p className="text-sm leading-relaxed text-muted">
                  Нажмите кнопку — мы определим ваше местоположение и подтвердим, что вы
                  находитесь на месте проведения мероприятия.
                </p>
                <Button className="w-full" size="lg" onClick={handleGeo} disabled={submitting}>
                  {submitting && (
                    <CircleNotch className="size-5 animate-spin" weight="bold" aria-hidden />
                  )}
                  <MapPin className="size-5" weight="duotone" aria-hidden />
                  {submitting ? "Определяем геопозицию…" : "Отметиться по геолокации"}
                </Button>
              </>
            ) : (
              <p className="rounded-sm bg-surface-muted px-3 py-3 text-center text-sm font-medium text-muted">
                Для этого мероприятия гео-чек-ин недоступен. Используйте QR-код.
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: Icon;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`flex min-h-12 items-center justify-center gap-2 text-sm font-semibold transition-colors ${
        active
          ? "border-b-2 border-primary text-primary"
          : "border-b-2 border-transparent text-muted hover:text-foreground"
      }`}
    >
      <Icon className="size-[1.125rem]" weight="duotone" aria-hidden />
      {children}
    </button>
  );
}
