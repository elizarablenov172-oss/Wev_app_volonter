import { requireRole } from "@/server/auth";
import { AppShell } from "@/components/layout/app-shell";

/** Админ-панель — требует роль ADMIN. */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["ADMIN"]);

  return (
    <AppShell
      user={{
        displayName: user.displayName,
        role: user.role,
        balance: user.cachedBalance,
      }}
    >
      {children}
    </AppShell>
  );
}
