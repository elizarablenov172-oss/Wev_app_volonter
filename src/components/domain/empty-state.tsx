import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  icon?: LucideIcon;
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
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span
        className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary"
        aria-hidden
      >
        <Icon className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="font-bold">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-sm text-muted">{description}</p>
        )}
      </div>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}
