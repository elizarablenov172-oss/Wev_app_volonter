"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAsyncResource } from "@/lib/use-async-resource";
import { FeedItem, type FeedItemData } from "./feed-item";
import { EmptyState } from "./empty-state";

export interface ActivityFeedProps {
  /** Чья лента — userId для GET /api/profile/feed?userId=. */
  userId: string;
  /** Свой профиль (влияет на тексты empty-состояния). */
  isOwner?: boolean;
}

/**
 * Клиентская лента активности. Тянет /api/profile/feed (cookie передаётся
 * автоматически на том же домене). Состояния: loading / error / empty / list.
 */
export function ActivityFeed({ userId, isOwner = false }: ActivityFeedProps) {
  const loader = React.useCallback(
    async (signal: AbortSignal): Promise<FeedItemData[]> => {
      const res = await fetch(
        `/api/profile/feed?userId=${encodeURIComponent(userId)}`,
        { credentials: "same-origin", signal },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось загрузить ленту");
      }
      return (data.items ?? []) as FeedItemData[];
    },
    [userId],
  );

  const state = useAsyncResource(loader, userId);

  if (state.status === "loading") {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-start gap-3 py-4">
              <Skeleton className="size-10 shrink-0 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-danger-strong">
          {state.message}
        </CardContent>
      </Card>
    );
  }

  if (state.data.length === 0) {
    return (
      <EmptyState
        icon={Sparkles}
        title="Пока пусто"
        description={
          isOwner
            ? "Участвуйте в мероприятиях и заданиях — события появятся здесь."
            : "У пользователя пока нет публичной активности."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {state.data.map((item) => (
        <FeedItem key={item.id} item={item} />
      ))}
    </div>
  );
}
