import { Coins } from "lucide-react";
import { requireUser } from "@/server/auth";
import { formatTokens } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

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
          <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-3 py-1 text-sm font-bold text-warning-strong">
            <Coins className="size-4" aria-hidden />
            <span className="tabular">{formatTokens(user.cachedBalance)}</span> токенов
          </span>
        </p>
      </div>

      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">Лента активности</h2>
        <Badge variant="warning">В разработке</Badge>
      </div>

      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="flex items-center gap-3 py-4">
              <div className="size-10 shrink-0 rounded-full bg-surface-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/3 rounded bg-surface-muted" />
                <div className="h-3 w-2/3 rounded bg-surface-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-center text-sm text-muted">
        Здесь появятся события друзей, начисления токенов и новости сообщества.
      </p>
    </div>
  );
}
