import { ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);
  return (
    <PagePlaceholder
      icon={ShieldCheck}
      title="Админ-панель"
      description="Модерация организаций и мероприятий, правила начислений, журнал токенов и пользователи — на этапе «Админ»."
    />
  );
}
