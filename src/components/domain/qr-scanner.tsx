"use client";

import * as React from "react";
import {
  Camera,
  CameraSlash,
  Keyboard,
  CircleNotch,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QrScannerProps {
  /** Вызывается с распознанным/введённым QR-секретом. */
  onResult: (qrSecret: string) => void;
  /** Внешний признак «идёт отправка» — блокирует ввод. */
  busy?: boolean;
}

const SCANNER_ELEMENT_ID = "qr-scanner-region";

/**
 * Извлекает qrSecret из payload QR.
 * Payload организации — JSON `{ eventId, qrSecret }`; на случай если в QR
 * закодирована «голая» строка секрета — принимаем и её.
 */
function extractSecret(raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed.qrSecret === "string" && parsed.qrSecret) {
      return parsed.qrSecret;
    }
  } catch {
    // не JSON — трактуем как сам секрет
  }
  return text;
}

/**
 * Сканер QR-кода чек-ина.
 * Камера через html5-qrcode (ленивый импорт, только в браузере). Если камера
 * недоступна/не выдан доступ — fallback: ручной ввод payload/секрета.
 */
export function QrScanner({ onResult, busy = false }: QrScannerProps) {
  const [mode, setMode] = React.useState<"camera" | "manual">("camera");
  const [starting, setStarting] = React.useState(false);
  const [scanning, setScanning] = React.useState(false);
  const [cameraError, setCameraError] = React.useState<string | null>(null);
  const [manualValue, setManualValue] = React.useState("");

  // Храним инстанс html5-qrcode, чтобы корректно остановить при размонтировании.
  const scannerRef = React.useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const handledRef = React.useRef(false);

  const stopCamera = React.useCallback(async () => {
    const inst = scannerRef.current;
    scannerRef.current = null;
    if (inst) {
      try {
        await inst.stop();
        inst.clear();
      } catch {
        // уже остановлен — игнорируем
      }
    }
    setScanning(false);
  }, []);

  const startCamera = React.useCallback(async () => {
    setCameraError(null);
    setStarting(true);
    handledRef.current = false;
    try {
      const mod = await import("html5-qrcode");
      const Html5Qrcode = mod.Html5Qrcode;
      const instance = new Html5Qrcode(SCANNER_ELEMENT_ID);
      scannerRef.current = instance as unknown as {
        stop: () => Promise<void>;
        clear: () => void;
      };

      await instance.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decodedText: string) => {
          if (handledRef.current) return;
          const secret = extractSecret(decodedText);
          if (secret) {
            handledRef.current = true;
            void stopCamera();
            onResult(secret);
          }
        },
        () => {
          // покадровые «не распознано» — игнорируем
        },
      );
      setScanning(true);
    } catch (err) {
      const message =
        err instanceof Error && /permission|denied|NotAllowed/i.test(err.message)
          ? "Доступ к камере не выдан. Введите код вручную."
          : "Камера недоступна. Введите код вручную.";
      setCameraError(message);
      setMode("manual");
      await stopCamera();
    } finally {
      setStarting(false);
    }
  }, [onResult, stopCamera]);

  // Останавливаем камеру при размонтировании / уходе из режима камеры.
  React.useEffect(() => {
    return () => {
      void stopCamera();
    };
  }, [stopCamera]);

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const secret = extractSecret(manualValue);
    if (secret) onResult(secret);
  }

  return (
    <div className="space-y-4">
      {/* Переключатель камера/ручной ввод. */}
      <div
        className="grid grid-cols-2 gap-1 rounded-sm bg-surface-muted p-1"
        role="tablist"
        aria-label="Способ ввода QR"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === "camera"}
          onClick={() => {
            setMode("camera");
            setCameraError(null);
          }}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-semibold transition-colors ${
            mode === "camera"
              ? "bg-surface text-foreground shadow-xs"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Camera className="size-4" weight="duotone" aria-hidden />
          Камера
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "manual"}
          onClick={() => {
            setMode("manual");
            void stopCamera();
          }}
          className={`flex min-h-10 items-center justify-center gap-1.5 rounded-sm px-3 text-sm font-semibold transition-colors ${
            mode === "manual"
              ? "bg-surface text-foreground shadow-xs"
              : "text-muted hover:text-foreground"
          }`}
        >
          <Keyboard className="size-4" weight="duotone" aria-hidden />
          Ввести код
        </button>
      </div>

      {mode === "camera" ? (
        <div className="space-y-3">
          {/* Область видоискателя html5-qrcode. */}
          <div
            id={SCANNER_ELEMENT_ID}
            className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-md border border-border bg-neutral-900/90 [&_video]:size-full [&_video]:object-cover"
          >
            {!scanning && !starting && (
              <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-neutral-300">
                <CameraSlash className="size-8" weight="duotone" aria-hidden />
                <p className="text-sm">Камера выключена</p>
              </div>
            )}
          </div>

          {cameraError && (
            <p className="rounded-sm bg-danger-soft px-3 py-2 text-center text-sm font-medium text-danger-strong">
              {cameraError}
            </p>
          )}

          {scanning ? (
            <Button
              type="button"
              variant="secondary"
              className="w-full"
              onClick={() => void stopCamera()}
            >
              Остановить камеру
            </Button>
          ) : (
            <Button
              type="button"
              className="w-full"
              onClick={() => void startCamera()}
              disabled={starting || busy}
            >
              {starting && (
                <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
              )}
              {starting ? "Запуск камеры…" : "Включить камеру и сканировать"}
            </Button>
          )}

          <p className="text-center text-xs text-muted">
            Наведите камеру на QR-код мероприятия у организатора.
          </p>
        </div>
      ) : (
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div>
            <Label htmlFor="qr-manual">Код мероприятия</Label>
            <Input
              id="qr-manual"
              value={manualValue}
              onChange={(e) => setManualValue(e.target.value)}
              placeholder="Вставьте код или payload из QR"
              autoComplete="off"
              disabled={busy}
            />
          </div>
          <Button type="submit" className="w-full" disabled={busy || !manualValue.trim()}>
            {busy && (
              <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
            )}
            Подтвердить чек-ин
          </Button>
          <p className="text-center text-xs text-muted">
            Если камера недоступна — попросите у организатора код мероприятия и вставьте его сюда.
          </p>
        </form>
      )}
    </div>
  );
}
