import { ListChecks } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getMissionsForUser } from "@/server/missions/queries";
import { PageHeader } from "@/components/layout/page-header";
import { MissionCard } from "@/components/domain/mission-card";
import { EmptyState } from "@/components/domain/empty-state";

export default async function MissionsPage() {
  const user = await requireUser();
  const missions = await getMissionsForUser(user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Задания"
        description="Выполняйте задания и получайте Social Tokens."
      />

      {missions.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="Заданий пока нет"
          description="Новые задания появятся здесь — заглядывайте позже."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {missions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      )}
    </div>
  );
}
