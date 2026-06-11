import { notFound } from "next/navigation";
import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { getMissionForEdit } from "@/server/missions/queries";
import { PageHeader } from "@/components/layout/page-header";
import { MissionForm } from "@/components/domain/mission-form";
import { isoToDatetimeLocal } from "@/lib/missions";

export default async function EditMissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const m = await getMissionForEdit(id);
  if (!m) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/admin/missions"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К заданиям
      </Link>
      <PageHeader title="Редактирование задания" />
      <MissionForm
        mode="edit"
        missionId={m.id}
        initial={{
          title: m.title,
          description: m.description,
          targetUrl: m.targetUrl ?? "",
          instruction: m.instruction ?? "",
          rewardTokens: String(m.rewardTokens),
          deadlineLocal: isoToDatetimeLocal(m.deadline),
          audience: m.audience ?? "",
          proofMethod: m.proofMethod,
          isActive: m.isActive,
        }}
      />
    </div>
  );
}
