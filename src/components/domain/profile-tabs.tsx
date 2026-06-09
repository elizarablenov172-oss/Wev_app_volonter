"use client";

import * as React from "react";
import { CalendarCheck, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import { ActivityFeed } from "./activity-feed";
import { EmptyState } from "./empty-state";

export interface ProfileTabsProps {
  userId: string;
  isOwner?: boolean;
}

type TabKey = "feed" | "events" | "rewards";

const TABS: { key: TabKey; label: string }[] = [
  { key: "feed", label: "Лента" },
  { key: "events", label: "История участия" },
  { key: "rewards", label: "Награды" },
];

/**
 * Табы профиля: Лента (реальная) / История участия / Награды (заглушки —
 * подключаются на этапах 4–5).
 */
export function ProfileTabs({ userId, isOwner = false }: ProfileTabsProps) {
  const [active, setActive] = React.useState<TabKey>("feed");

  return (
    <div className="space-y-4">
      <div
        role="tablist"
        aria-label="Разделы профиля"
        className="flex gap-1 overflow-x-auto rounded-lg bg-surface-muted p-1"
      >
        {TABS.map((tab) => {
          const selected = active === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex-1 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                selected
                  ? "bg-surface text-primary shadow-sm"
                  : "text-muted hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div role="tabpanel">
        {active === "feed" && (
          <ActivityFeed userId={userId} isOwner={isOwner} />
        )}
        {active === "events" && (
          <EmptyState
            icon={CalendarCheck}
            title="История участия скоро появится"
            description="Здесь будут мероприятия, в которых вы участвовали. Раздел подключается на следующем этапе."
          />
        )}
        {active === "rewards" && (
          <EmptyState
            icon={Gift}
            title="Награды скоро появятся"
            description="Полученные награды и купоны будут отображаться здесь. Раздел подключается на этапе маркетплейса."
          />
        )}
      </div>
    </div>
  );
}
