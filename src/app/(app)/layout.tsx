import { requireUser } from "@/server/auth";
import { AppShell } from "@/components/layout/app-shell";

/** Серверный лэйаут для разделов волонтёра (любой авторизованный пользователь). */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

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
