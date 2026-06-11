import { Badge } from "@/components/ui/badge";
import {
  REWARD_TYPE_META,
  REDEMPTION_STATUS_META,
  type RewardType,
  type RedemptionStatus,
} from "@/lib/rewards";

interface RewardTypeBadgeProps {
  type: RewardType;
  className?: string;
}

/** Бейдж типа награды (цвета — по словарю дизайн-системы). */
export function RewardTypeBadge({ type, className }: RewardTypeBadgeProps) {
  const meta = REWARD_TYPE_META[type];
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}

interface RedemptionStatusBadgeProps {
  status: RedemptionStatus;
  className?: string;
}

/** Бейдж статуса выкупа/заявки волонтёра. */
export function RedemptionStatusBadge({
  status,
  className,
}: RedemptionStatusBadgeProps) {
  const meta = REDEMPTION_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
