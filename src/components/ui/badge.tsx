import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Бейдж статуса. Цвета следуют контрастным правилам брендбука:
 * янтарь/зелёный — только soft-фон + затемнённый текст (на белом как текст не используем).
 */
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-sm px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.02em] whitespace-nowrap ring-1 ring-inset",
  {
    variants: {
      variant: {
        primary: "bg-primary-soft text-primary ring-primary/15",
        success: "bg-success-soft text-success-strong ring-success-strong/15",
        warning: "bg-warning-soft text-warning-strong ring-warning-strong/15",
        danger: "bg-danger-soft text-danger-strong ring-danger-strong/15",
        muted: "bg-surface-muted text-muted ring-border",
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
