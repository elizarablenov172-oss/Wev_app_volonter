import { requireRole } from "@/server/auth";
import { listAccountsForModeration } from "@/server/admin/queries";
import { PageHeader } from "@/components/layout/page-header";
import { AdminAccounts } from "@/components/domain/admin-accounts";

export default async function AdminOrgsPage() {
  await requireRole(["ADMIN"]);
  const { organizations, partners } = await listAccountsForModeration();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Организации и партнёры"
        description="Верификация аккаунтов организаций и брендов-партнёров."
      />
      <AdminAccounts
        organizations={organizations.map((o) => ({
          id: o.id,
          title: o.name,
          description: o.description,
          status: o.status,
          email: o.user.email,
        }))}
        partners={partners.map((p) => ({
          id: p.id,
          title: p.brandName,
          description: p.description,
          status: p.status,
          email: p.user.email,
        }))}
      />
    </div>
  );
}
