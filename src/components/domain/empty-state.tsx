import * as React from "react";
import type { Icon } from "@phosphor-icons/react";
import { Tray } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: Icon;
  title: string;
  description?: string;
  /** Опциональная кнопка-призыв к действию. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * Пустое состояние раздела: иконка в мягком круге + заголовок + подсказка
 * (+ опц. CTA). Используется для пустой ленты, истории, наград.
 */
export function EmptyState({
  icon: Icon = Tray,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-md border border-dashed border-border-strong bg-surface px-6 py-10 text-center",
        className,
      )}
    >
      <span
        className="flex size-11 items-center justify-center rounded-md bg-surface-muted text-muted ring-1 ring-inset ring-border"
        aria-hidden
      >
        <Icon className="size-[1.375rem]" weight="duotone" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
