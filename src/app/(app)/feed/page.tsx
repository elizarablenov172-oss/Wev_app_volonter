import { requireUser } from "@/server/auth";
import { BalanceChip } from "@/components/domain/balance-chip";
import { ActivityFeed } from "@/components/domain/activity-feed";

export default async function FeedPage() {
  const user = await requireUser();

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          Привет, {user.displayName}!
        </h1>
        <p className="inline-flex items-center gap-2 text-muted">
          Баланс:
          <BalanceChip value={user.cachedBalance} withLabel />
        </p>
      </div>

      <h2 className="text-lg font-bold">Лента активности</h2>

      <ActivityFeed userId={user.id} isOwner />
    </div>
  );
}
