import { requireUser } from "@/server/auth";
import { getPendingRedemptions } from "@/server/rewards/queries";
import { PageHeader } from "@/components/layout/page-header";
import { RedemptionDecisionQueue } from "@/components/domain/redemption-decision-queue";

export default async function AdminRewardsModerationPage() {
  await requireUser();
  const items = await getPendingRedemptions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Заявки на награды"
        description="Одобрение крупных наград (поездки, доступ на события). При отклонении токены возвращаются волонтёру."
      />
      <RedemptionDecisionQueue initialItems={items} />
    </div>
  );
}
