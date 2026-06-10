import * as React from "react";
import type { Icon } from "@phosphor-icons/react";
import { Wrench } from "@phosphor-icons/react/dist/ssr";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";

interface PagePlaceholderProps {
  title: string;
  description?: string;
  /** Иконка пустого состояния (Phosphor). */
  icon?: Icon;
  children?: React.ReactNode;
}

/** Брендированная заглушка раздела «В разработке» для следующих этапов. */
export function PagePlaceholder({
  title,
  description,
  icon: PlaceholderIcon = Wrench,
  children,
}: PagePlaceholderProps) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={<Badge variant="warning">В разработке</Badge>}
      />

      {children ?? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-strong bg-surface px-6 py-16 text-center">
          <span
            className="flex size-12 items-center justify-center rounded-md bg-surface-muted text-muted ring-1 ring-inset ring-border"
            aria-hidden
          >
            <PlaceholderIcon className="size-6" weight="duotone" />
          </span>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">
              Скоро здесь появится контент
            </p>
            <p className="mx-auto max-w-sm text-sm text-muted">
              Раздел подключается на следующих этапах разработки.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
