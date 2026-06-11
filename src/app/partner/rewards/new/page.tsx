import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { RewardForm } from "@/components/domain/reward-form";

export default function NewRewardPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/partner/rewards"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К наградам
      </Link>
      <PageHeader
        title="Новая награда"
        description="Заполните поля — награда появится в маркетплейсе."
      />
      <RewardForm mode="create" />
    </div>
  );
}
