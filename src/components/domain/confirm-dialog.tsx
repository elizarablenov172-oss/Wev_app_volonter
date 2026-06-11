"use client";

import * as React from "react";
import { CircleNotch, X } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: React.ReactNode;
  /** Подпись подтверждающей кнопки. */
  confirmLabel?: string;
  cancelLabel?: string;
  /** Вариант подтверждающей кнопки (по умолчанию primary). */
  confirmVariant?: "primary" | "danger" | "success";
  /** Идёт ли асинхронная операция (блокирует кнопки, спиннер). */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Модальное подтверждение действия (overlay + центрированная карточка).
 * Доступность: Esc закрывает, фокус-ловушка простая (autoFocus на кнопке),
 * клик по подложке — отмена. Используется для покупки/резерва/отмены.
 */
export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Подтвердить",
  cancelLabel = "Отмена",
  confirmVariant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) onCancel();
    }
    document.addEventListener("keydown", onKey);
    // Блокируем прокрутку фона, пока диалог открыт.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={() => {
        if (!busy) onCancel();
      }}
    >
      <div
        className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="confirm-dialog-title"
            className="text-lg font-bold tracking-[-0.01em] text-foreground"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex size-8 shrink-0 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground disabled:opacity-50"
            aria-label="Закрыть"
          >
            <X className="size-5" weight="bold" aria-hidden />
          </button>
        </div>

        {description && (
          <div className="mt-2 text-sm leading-relaxed text-muted">
            {description}
          </div>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={busy}
            autoFocus
          >
            {busy && (
              <CircleNotch className="size-4 animate-spin" weight="bold" aria-hidden />
            )}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
