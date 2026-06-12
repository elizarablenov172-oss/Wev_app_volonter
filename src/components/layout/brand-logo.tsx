import { cn } from "@/lib/utils";

interface BrandLogoProps {
  /** Показывать дескриптор «Континент возможностей» (скрыт на узких экранах). */
  descriptor?: boolean;
  /** Размер фирменного флага-графа. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const MARK_SIZE: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "h-7",
  md: "h-9",
  lg: "h-12",
};

const NAME_SIZE: Record<NonNullable<BrandLogoProps["size"]>, string> = {
  sm: "text-[0.9375rem]",
  md: "text-lg",
  lg: "text-2xl",
};

/**
 * Логотип НКО «Евразия»: фирменный графический элемент (флаг) + название.
 * Флаг — официальный знак из брендбука (public/brand/eurasia-mark.png).
 */
export function BrandLogo({ descriptor = false, size = "sm", className }: BrandLogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/eurasia-mark.png"
        alt="Логотип «Евразия»"
        className={cn("w-auto", MARK_SIZE[size])}
      />
      <span className="flex flex-col leading-none">
        <span className={cn("font-bold tracking-[-0.02em] text-foreground", NAME_SIZE[size])}>
          Евразия
        </span>
        {descriptor && (
          <span className="mt-0.5 hidden text-[0.625rem] font-medium uppercase tracking-[0.08em] text-muted sm:inline">
            Континент возможностей
          </span>
        )}
      </span>
    </span>
  );
}
