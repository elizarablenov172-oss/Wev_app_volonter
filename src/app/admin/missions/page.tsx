import Link from "next/link";
import { Plus, Megaphone, ClipboardText } from "@phosphor-icons/react/dist/ssr";
import { getAdminMissions } from "@/server/missions/queries";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/domain/empty-state";
import { TokenAmount } from "@/components/domain/token-amount";
import { PROOF_METHOD_META, formatMissionDate } from "@/lib/missions";

export default async function AdminMissionsPage() {
  const items = await getAdminMissions();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Задания"
        description="Создавайте задания и проверяйте выполнение волонтёрами."
        actions={
          <div className="flex gap-2">
            <Link href="/admin/missions/submissions">
              <Button variant="secondary">
                <ClipboardText className="size-4" weight="duotone" aria-hidden />
                Проверка
              </Button>
            </Link>
            <Link href="/admin/missions/new">
              <Button>
                <Plus className="size-4" weight="bold" aria-hidden />
                Создать
              </Button>
            </Link>
          </div>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          title="Заданий пока нет"
          description="Создайте первое задание — волонтёры смогут его выполнить за токены."
          action={
            <Link href="/admin/missions/new">
              <Button>Создать задание</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((m) => (
            <Link
              key={m.id}
              href={`/admin/missions/${m.id}/edit`}
              className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-strong"
            >
              <div className="flex items-start justify-between gap-2">
                <Badge variant="muted">{PROOF_METHOD_META[m.proofMethod]}</Badge>
                {!m.isActive && <Badge variant="muted">Скрыто</Badge>}
              </div>
              <h3 className="line-clamp-2 font-bold tracking-[-0.01em]">{m.title}</h3>
              <dl className="mt-auto space-y-1 border-t border-border pt-3 text-sm text-muted">
                <div className="flex items-center justify-between">
                  <dt>Награда</dt>
                  <dd>
                    <TokenAmount value={m.rewardTokens} sign="neutral" />
                  </dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>На проверке</dt>
                  <dd className="tabular font-semibold text-foreground">{m.pending}</dd>
                </div>
                <div className="flex items-center justify-between">
                  <dt>Выполнили</dt>
                  <dd className="tabular font-semibold text-foreground">{m.completed}</dd>
                </div>
                {m.deadline && (
                  <div className="flex items-center justify-between">
                    <dt>Дедлайн</dt>
                    <dd>{formatMissionDate(m.deadline)}</dd>
                  </div>
                )}
              </dl>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
