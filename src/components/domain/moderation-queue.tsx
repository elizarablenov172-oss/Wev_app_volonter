"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  CalendarBlank,
  ShieldCheck,
  X,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { ModerationPanel } from "@/components/domain/moderation-panel";
import {
  formatEventDateTime,
  type ModerationEventItem,
} from "@/lib/events";

interface ModerationQueueProps {
  initialItems: ModerationEventItem[];
}

/**
 * Очередь модерации мероприятий (master-detail на ПК, список + полноэкранная
 * панель на телефоне). После решения событие убирается из очереди.
 */
export function ModerationQueue({ initialItems }: ModerationQueueProps) {
  const router = useRouter();
  const [items, setItems] = React.useState(initialItems);
  const [selectedId, setSelectedId] = React.useState<string | null>(
    initialItems[0]?.id ?? null,
  );

  function handleResolved(eventId: string) {
    setItems((prev) => {
      const next = prev.filter((e) => e.id !== eventId);
      // Переключаемся на следующее событие в очереди.
      setSelectedId((cur) => (cur === eventId ? (next[0]?.id ?? null) : cur));
      return next;
    });
    router.refresh();
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Очередь модерации пуста"
        description="Все мероприятия обработаны. Новые заявки от организаций появятся здесь автоматически."
      />
    );
  }

  const selected = items.find((e) => e.id === selectedId) ?? null;

  return (
    <>
      {/* ПК (≥lg): master-detail — список слева, панель справа (липкая). */}
      <div className="hidden lg:grid lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:items-start lg:gap-6">
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id}>
              <QueueListButton
                event={e}
                active={e.id === selectedId}
                onSelect={() => setSelectedId(e.id)}
              />
            </li>
          ))}
        </ul>

        <Card className="sticky top-20 p-6">
          {selected ? (
            <ModerationPanel event={selected} onResolved={handleResolved} />
          ) : (
            <p className="text-sm text-muted">Выберите мероприятие из очереди слева.</p>
          )}
        </Card>
      </div>

      {/* Телефон/планшет (<lg): список карточек + полноэкранная панель. */}
      <div className="lg:hidden">
        <ul className="space-y-2">
          {items.map((e) => (
            <li key={e.id}>
              <QueueListButton
                event={e}
                active={false}
                onSelect={() => setSelectedId(e.id)}
              />
            </li>
          ))}
        </ul>

        {selected && (
          <div className="fixed inset-0 z-50 flex flex-col bg-background">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm font-bold">
                <ShieldCheck className="size-5 text-primary" weight="duotone" aria-hidden />
                Модерация
              </span>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="flex size-9 items-center justify-center rounded-sm text-muted transition-colors hover:bg-surface-muted hover:text-foreground"
                aria-label="Закрыть"
              >
                <X className="size-5" weight="bold" aria-hidden />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <ModerationPanel event={selected} onResolved={handleResolved} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function QueueListButton({
  event,
  active,
  onSelect,
}: {
  event: ModerationEventItem;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-md border bg-surface p-3.5 text-left transition-colors ${
        active
          ? "border-primary ring-1 ring-inset ring-primary/30"
          : "border-border hover:border-border-strong hover:bg-surface-muted/40"
      }`}
      aria-current={active ? "true" : undefined}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold text-foreground">{event.title}</span>
        <Badge variant="primary">{event.category}</Badge>
      </div>
      <p className="mt-1 truncate text-xs text-muted">{event.organization.name}</p>
      <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-muted">
        <CalendarBlank className="size-3.5" weight="duotone" aria-hidden />
        {formatEventDateTime(event.startsAt)}
      </p>
    </button>
  );
}
