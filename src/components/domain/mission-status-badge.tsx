import { Badge } from "@/components/ui/badge";
import { MISSION_STATUS_META, type MissionStatus } from "@/lib/missions";

/** Бейдж статуса задания (цвета — по дизайн-словарю). */
export function MissionStatusBadge({
  status,
  className,
}: {
  status: MissionStatus;
  className?: string;
}) {
  const meta = MISSION_STATUS_META[status];
  return (
    <Badge variant={meta.variant} className={className}>
      {meta.label}
    </Badge>
  );
}
