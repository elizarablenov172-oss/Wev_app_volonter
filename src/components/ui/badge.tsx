import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Бейдж статуса. Цвета следуют контрастным правилам брендбука:
 * янтарь/зелёный — только soft-фон + затемнённый текст (на белом как текст не используем).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-primary-soft text-primary",
        success: "bg-success-soft text-success-strong",
        warning: "bg-warning-soft text-warning-strong",
        danger: "bg-danger-soft text-danger-strong",
        muted: "bg-surface-muted text-muted",
      },
    },
    defaultVariants: { variant: "muted" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { badgeVariants };
