import { requireRole } from "@/server/auth";
import { getProfileRules } from "@/server/admin/queries";
import { PageHeader } from "@/components/layout/page-header";
import { AdminProfileRules } from "@/components/domain/admin-profile-rules";

export default async function AdminProfileRulesPage() {
  await requireRole(["ADMIN"]);
  const rules = await getProfileRules();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Правила начислений за профиль"
        description="Токены за заполнение профиля (ТЗ 3.9). «Лимит» — максимум начислений по правилу (для ссылок и т.п.)."
      />
      <AdminProfileRules rules={rules} />
    </div>
  );
}
