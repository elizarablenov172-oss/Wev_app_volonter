import { requireRole } from "@/server/auth";
import { AppShell } from "@/components/layout/app-shell";

/** Кабинет организации — требует роль ORGANIZATION. */
export default async function OrgLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["ORGANIZATION"]);

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
