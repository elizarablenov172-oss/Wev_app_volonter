import { requireRole } from "@/server/auth";
import { AppShell } from "@/components/layout/app-shell";

/** Кабинет партнёра — требует роль PARTNER. */
export default async function PartnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["PARTNER"]);

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
