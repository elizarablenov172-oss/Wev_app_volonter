import { requireRole } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { PagePlaceholder } from "@/components/layout/page-placeholder";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
      title="Кабинет организации"
      description="Управление мероприятиями, участниками и QR-чек-ином — на следующих этапах."
    >
      <Card>
        <CardContent className="space-y-3 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Организация</div>
              <div className="text-lg font-bold">{org?.name ?? user.displayName}</div>
            </div>
            {status && <Badge variant={status.variant}>{status.label}</Badge>}
          </div>
          {org?.status === "PENDING" && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">
              Аккаунт на модерации. После одобрения админом вы сможете публиковать
              мероприятия.
            </p>
          )}
        </CardContent>
      </Card>
    </PagePlaceholder>
  );
}
