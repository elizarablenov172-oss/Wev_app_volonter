import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/layout/page-header";
import { MissionForm } from "@/components/domain/mission-form";

export default function NewMissionPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/admin/missions"
        className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
      >
        <CaretLeft className="size-4" weight="bold" aria-hidden />
        К заданиям
      </Link>
      <PageHeader title="Новое задание" />
      <MissionForm mode="create" />
    </div>
  );
}
