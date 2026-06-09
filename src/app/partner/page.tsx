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

export default async function PartnerDashboardPage() {
  const user = await requireRole(["PARTNER"]);
  const partner = await prisma.partner.findUnique({
    where: { userId: user.id },
    select: { brandName: true, status: true },
  });

  const status = partner ? STATUS_BADGE[partner.status] : null;

  return (
    <PagePlaceholder
      title="Кабинет партнёра"
      description="Управление наградами и заявками на выдачу — на этапе «Marketplace»."
    >
      <Card>
        <CardContent className="space-y-3 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-sm text-muted">Бренд</div>
              <div className="text-lg font-bold">
                {partner?.brandName ?? user.displayName}
              </div>
            </div>
            {status && <Badge variant={status.variant}>{status.label}</Badge>}
          </div>
          {partner?.status === "PENDING" && (
            <p className="rounded-md bg-warning-soft px-3 py-2 text-sm text-warning-strong">
              Аккаунт на модерации. После одобрения админом вы сможете добавлять
              награды в маркетплейс.
            </p>
          )}
        </CardContent>
      </Card>
    </PagePlaceholder>
  );
}
