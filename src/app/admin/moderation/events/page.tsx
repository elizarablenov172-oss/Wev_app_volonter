import { requireRole } from "@/server/auth";
import { getModerationQueue } from "@/server/events/queries";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/layout/page-header";
import { ModerationQueue } from "@/components/domain/moderation-queue";

/**
 * Очередь модерации мероприятий (админ). Master-detail на ПК, карточки +
 * полноэкранная панель на телефоне. Одобрение требует награды > 0.
 */
export default async function EventsModerationPage() {
  await requireRole(["ADMIN"]);
  const items = await getModerationQueue();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Модерация мероприятий"
        description="Проверьте заявки организаций, назначьте награду и опубликуйте или отклоните."
        actions={
          items.length > 0 ? (
            <Badge variant="warning">{items.length} в очереди</Badge>
          ) : undefined
        }
      />

      <ModerationQueue initialItems={items} />
    </div>
  );
}
