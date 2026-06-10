"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-labelledby"?: string;
}

/** Переключатель (toggle) на основе button[role=switch] — доступен с клавиатуры. */
export function Switch({
  checked,
  onCheckedChange,
  id,
  disabled,
  ...aria
}: SwitchProps) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-primary" : "border border-border-strong bg-surface-muted",
      )}
      {...aria}
    >
      <span
        className={cn(
          "inline-block size-4 rounded-full bg-surface shadow-sm transition-transform",
          checked ? "translate-x-[1.125rem]" : "translate-x-0.5",
        )}
      />
    </button>
  );
}
