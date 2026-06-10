import { Buildings } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Badge } from "@/components/ui/badge";

const STATUS_BADGE = {
  PENDING: { variant: "warning" as const, label: "На модерации" },
  APPROVED: { variant: "success" as const, label: "Одобрено" },
  REJECTED: { variant: "danger" as const, label: "Отклонено" },
};

export default async function OrgDashboardPage() {
  const user = await requireRole(["ORGANIZATION"]);
  const org = await prisma.organization.findUnique({
    where: { userId: user.id },
    select: { name: true, status: true },
  });

  const status = org ? STATUS_BADGE[org.status] : null;

  return (
    <PagePlaceholder
      icon={Buildings}
      title="Кабинет организации"
      description="Управление мероприятиями, участниками и QR-чек-ином — на следующих этапах."
    >
      <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              Организация
            </p>
            <p className="mt-0.5 truncate text-lg font-bold tracking-[-0.01em]">
              {org?.name ?? user.displayName}
            </p>
          </div>
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        {org?.status === "PENDING" && (
          <p className="border-t border-border bg-warning-soft px-5 py-3 text-sm text-warning-strong">
            Аккаунт на модерации. После одобрения админом вы сможете публиковать
            мероприятия.
          </p>
        )}
      </section>
    </PagePlaceholder>
  );
}
