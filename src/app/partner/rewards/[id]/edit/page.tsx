import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import { getPartnerRewardForEdit } from "@/server/rewards/queries";
import { PageHeader } from "@/components/layout/page-header";
import { RewardForm } from "@/components/domain/reward-form";
import { isoToDateInput } from "@/lib/rewards";

export default async function EditRewardPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const reward = await getPartnerRewardForEdit(id, user.id);
  if (!reward) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/partner/rewards"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К наградам
      </Link>
      <PageHeader title="Редактирование награды" />
      <RewardForm
        mode="edit"
        rewardId={reward.id}
        initial={{
          title: reward.title,
          description: reward.description,
          type: reward.type,
          costTokens: String(reward.costTokens),
          stock: reward.stock == null ? "" : String(reward.stock),
          expiresAt: isoToDateInput(reward.expiresAt),
          conditions: reward.conditions ?? "",
          imageUrl: reward.imageUrl ?? "",
          requiresApproval: reward.requiresApproval,
          isActive: reward.isActive,
        }}
      />
    </div>
  );
}
