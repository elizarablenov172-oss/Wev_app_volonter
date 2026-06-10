import Link from "next/link";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { PageHeader } from "@/components/layout/page-header";
import { EventForm } from "@/components/domain/event-form";

/** Создание мероприятия организацией. После сохранения уходит на модерацию. */
export default async function NewOrgEventPage() {
  await requireRole(["ORGANIZATION"]);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-5">
      <div>
        <Link
          href="/org/events"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" weight="bold" aria-hidden />
          К моим мероприятиям
        </Link>
      </div>

      <PageHeader
        title="Новое мероприятие"
        description="Заполните данные. После создания мероприятие отправится на модерацию — администратор назначит награду и опубликует его."
      />

      <EventForm mode="create" />
    </div>
  );
}
