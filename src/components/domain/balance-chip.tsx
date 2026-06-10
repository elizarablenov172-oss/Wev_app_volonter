import * as React from "react";
import { Coins } from "@phosphor-icons/react/dist/ssr";
import { cn, formatTokens } from "@/lib/utils";

export interface BalanceChipProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Размер пилюли. */
  size?: "sm" | "md" | "lg";
  /** Добавить подпись «токенов» после числа. */
  withLabel?: boolean;
}

const SIZE: Record<NonNullable<BalanceChipProps["size"]>, string> = {
  sm: "px-2 py-1 text-xs gap-1",
  md: "px-2.5 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-lg gap-2",
};

const ICON_SIZE: Record<NonNullable<BalanceChipProps["size"]>, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-5",
};

/**
 * Чип баланса токенов. Янтарь — только фон (bg-warning-soft) + иконка-монета,
 * текст тёмный (text-warning-strong) для контраста AA на белом.
 */
export function BalanceChip({
  value,
  size = "md",
  withLabel = false,
  className,
  ...props
}: BalanceChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm bg-warning-soft font-bold text-warning-strong ring-1 ring-inset ring-warning-strong/15",
        SIZE[size],
        className,
      )}
      title="Баланс токенов"
      {...props}
    >
      <Coins
        className={cn("shrink-0 text-tokens", ICON_SIZE[size])}
        weight="duotone"
        aria-hidden
      />
      <span className="tabular tracking-[-0.01em]">{formatTokens(value)}</span>
      {withLabel && <span className="font-semibold">токенов</span>}
    </span>
  );
}
