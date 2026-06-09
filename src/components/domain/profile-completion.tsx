import * as React from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ProfileCompletionProps {
  /** Процент заполнения 0..100 (из computeProfileCompletion). */
  value: number;
  /** Ссылка на редактирование (показать CTA, если профиль неполный). */
  editHref?: string;
  className?: string;
}

const COMPLETE_THRESHOLD = 80;

/**
 * Индикатор заполнения профиля: прогресс-бар + подсказка о токенах.
 * При < 80% мотивирует дозаполнить ради бонуса.
 */
export function ProfileCompletion({
  value,
  editHref,
  className,
}: ProfileCompletionProps) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  const isComplete = pct >= COMPLETE_THRESHOLD;

  return (
    <Card className={className}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold">
            <Sparkles className="size-4 text-primary" aria-hidden />
            Заполнение профиля
          </span>
          <span className="tabular text-sm font-bold text-foreground">
            {pct}%
          </span>
        </div>

        <div
          className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Заполнение профиля"
        >
          <div
            className={cn(
              "h-full rounded-full transition-all",
              isComplete ? "bg-success" : "bg-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>

        <p className="text-sm text-muted">
          {isComplete ? (
            "Профиль заполнен — отличная работа! 🎉"
          ) : (
            <>
              Заполни профиль и получи токены.{" "}
              {editHref && (
                <a
                  href={editHref}
                  className="font-semibold text-primary hover:underline"
                >
                  Дозаполнить
                </a>
              )}
            </>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
