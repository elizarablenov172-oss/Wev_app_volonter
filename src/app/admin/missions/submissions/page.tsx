import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { getPendingSubmissions } from "@/server/missions/queries";
import { PageHeader } from "@/components/layout/page-header";
import { MissionReviewQueue } from "@/components/domain/mission-review-queue";

export default async function MissionSubmissionsPage() {
  const items = await getPendingSubmissions();

  return (
    <div className="space-y-6">
      <Link
        href="/admin/missions"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К заданиям
      </Link>
      <PageHeader
        title="Проверка заданий"
        description="Подтверждения выполнения от волонтёров. При принятии начисляются токены."
      />
      <MissionReviewQueue initialItems={items} />
    </div>
  );
}
