import * as React from "react";
import type { LucideIcon } from "lucide-react";
import {
  CalendarCheck,
  CircleCheckBig,
  Award,
  Gift,
  UserRoundPlus,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { TokenAmount } from "./token-amount";

/** Запись ленты активности (форма из API /api/profile/feed). */
export interface FeedItemData {
  id: string;
  type: string;
  text: string;
  refType: string | null;
  refId: string | null;
  visibility: string;
  createdAt: string;
}

interface FeedTypeMeta {
  icon: LucideIcon;
  /** Tailwind-классы фона/текста иконки. */
  tone: string;
}

/**
 * Метаданные оформления по типу записи. Янтарь/зелёный — только soft-фон
 * + затемнённый текст (контраст AA).
 */
const TYPE_META: Record<string, FeedTypeMeta> = {
  EVENT_JOIN: { icon: CalendarCheck, tone: "bg-primary-soft text-primary" },
  MISSION_DONE: {
    icon: CircleCheckBig,
    tone: "bg-success-soft text-success-strong",
  },
  BADGE: { icon: Award, tone: "bg-warning-soft text-warning-strong" },
  REWARD_BUY: { icon: Gift, tone: "bg-danger-soft text-danger-strong" },
  PROFILE_COMPLETE: {
    icon: UserRoundPlus,
    tone: "bg-primary-soft text-primary",
  },
  LEVEL_UP: { icon: TrendingUp, tone: "bg-success-soft text-success-strong" },
};

const FALLBACK_META: FeedTypeMeta = {
  icon: Sparkles,
  tone: "bg-surface-muted text-muted",
};

/** Извлекает «+N»/«−N» токенов из текста записи (если упомянуты). */
function extractTokenSign(
  type: string,
  text: string,
): { value: number; sign: "plus" | "minus" } | null {
  const match = text.match(/([+\-−])\s*(\d+)\s*токен/i);
  if (!match) return null;
  const value = Number(match[2]);
  if (!Number.isFinite(value) || value === 0) return null;
  const isMinus = match[1] === "-" || match[1] === "−" || type === "REWARD_BUY";
  return { value, sign: isMinus ? "minus" : "plus" };
}

export interface FeedItemProps {
  item: FeedItemData;
}

/** Карточка одной записи ленты: иконка по типу, текст, дата, опц. сумма токенов. */
export function FeedItem({ item }: FeedItemProps) {
  const meta = TYPE_META[item.type] ?? FALLBACK_META;
  const Icon = meta.icon;
  const tokens = extractTokenSign(item.type, item.text);

  let dateLabel = "";
  const parsed = new Date(item.createdAt);
  if (!Number.isNaN(parsed.getTime())) {
    dateLabel = format(parsed, "d MMMM, HH:mm", { locale: ru });
  }

  return (
    <Card>
      <CardContent className="flex items-start gap-3 py-4">
        <span
          className={`flex size-10 shrink-0 items-center justify-center rounded-full ${meta.tone}`}
          aria-hidden
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-sm leading-snug text-foreground">{item.text}</p>
          {dateLabel && (
            <time
              dateTime={item.createdAt}
              className="block text-xs text-muted"
            >
              {dateLabel}
            </time>
          )}
        </div>
        {tokens && (
          <TokenAmount
            value={tokens.value}
            sign={tokens.sign}
            withIcon
            className="shrink-0 text-sm"
          />
        )}
      </CardContent>
    </Card>
  );
}
