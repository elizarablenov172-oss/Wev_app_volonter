import * as React from "react";
import { Coins } from "lucide-react";
import { cn, formatTokens } from "@/lib/utils";

export type TokenSign = "plus" | "minus" | "neutral";

export interface TokenAmountProps
  extends React.HTMLAttributes<HTMLSpanElement> {
  value: number;
  /** Знак операции: 'plus' → зелёный «+N», 'minus' → малиновый «−N», 'neutral' → без знака. */
  sign?: TokenSign;
  /** Показать иконку-монету слева. */
  withIcon?: boolean;
}

/** Цвет текста по знаку (контраст AA: зелёный/малиновый — затемнённые). */
const SIGN_COLOR: Record<TokenSign, string> = {
  plus: "text-tokens-plus",
  minus: "text-danger",
  neutral: "text-foreground",
};

const SIGN_PREFIX: Record<TokenSign, string> = {
  plus: "+",
  minus: "−", // U+2212 minus sign
  neutral: "",
};

/**
 * Сумма в токенах с цветовой семантикой брендбука:
 * начисление «+N» — затемнённый зелёный, списание «−N» — малиновый.
 * Использует tabular-nums, чтобы цифры не «прыгали».
 */
export function TokenAmount({
  value,
  sign = "neutral",
  withIcon = false,
  className,
  ...props
}: TokenAmountProps) {
  const magnitude = Math.abs(value);

  return (
    <span
      className={cn(
        "tabular inline-flex items-center gap-1 font-bold",
        SIGN_COLOR[sign],
        className,
      )}
      {...props}
    >
      {withIcon && <Coins className="size-4 shrink-0" aria-hidden />}
      <span>
        {SIGN_PREFIX[sign]}
        {formatTokens(magnitude)}
      </span>
    </span>
  );
}
