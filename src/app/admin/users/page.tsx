import { requireRole } from "@/server/auth";
import { listUsers } from "@/server/admin/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { AdminUserTable } from "@/components/domain/admin-user-table";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const { q = "" } = await searchParams;
  const users = await listUsers(q);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Пользователи"
        description="Управление пользователями и блокировка нарушителей."
      />

      <form action="/admin/users" method="get" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Поиск по имени, email или нику"
          className="h-10 w-full max-w-md rounded-sm border border-border bg-surface px-3 text-sm shadow-xs focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        />
        <Button type="submit" variant="secondary">
          Найти
        </Button>
      </form>

      <AdminUserTable initialUsers={users} />
    </div>
  );
}
