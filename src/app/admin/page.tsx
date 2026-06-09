import { requireRole } from "@/server/auth";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);
  return (
    <PagePlaceholder
      title="Админ-панель"
      description="Модерация организаций и мероприятий, правила начислений, журнал токенов и пользователи — на этапе «Админ»."
    />
  );
}
