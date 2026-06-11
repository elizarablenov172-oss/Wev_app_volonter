import Link from "next/link";
import {
  CalendarCheck,
  Gift,
  Megaphone,
  Buildings,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { requireRole } from "@/server/auth";
import { getDashboardStats } from "@/server/admin/queries";
import { PageHeader } from "@/components/layout/page-header";
import { formatTokens } from "@/lib/utils";

export default async function AdminDashboardPage() {
  await requireRole(["ADMIN"]);
  const s = await getDashboardStats();

  const counters = [
    { label: "Волонтёры", value: s.volunteers },
    { label: "Организации", value: s.organizations },
    { label: "Партнёры", value: s.partners },
    { label: "Заблокировано", value: s.blocked },
  ];
  const tokens = [
    { label: "В обращении", value: s.tokensInCirculation },
    { label: "Начислено всего", value: s.tokensEarned },
    { label: "Потрачено", value: s.tokensSpent },
  ];
  const queue = [
    { label: "Мероприятия", value: s.eventsPending, href: "/admin/moderation/events", icon: CalendarCheck },
    { label: "Заявки на награды", value: s.redemptionsPending, href: "/admin/moderation/rewards", icon: Gift },
    { label: "Задания на проверке", value: s.submissionsPending, href: "/admin/missions/submissions", icon: Megaphone },
    { label: "Аккаунты", value: s.orgsPending + s.partnersPending, href: "/admin/orgs", icon: Buildings },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Админ-панель" description="Сводка по платформе и очередь модерации." />

      {/* Аудитория */}
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-4">
        {counters.map((c) => (
          <div key={c.label} className="bg-surface p-4">
            <p className="tabular text-3xl font-extrabold tracking-[-0.02em]">{formatTokens(c.value)}</p>
            <p className="mt-1 text-xs text-muted">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Токеномика */}
      <section className="rounded-lg border border-border bg-surface shadow-xs">
        <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          Социальные токены
        </h2>
        <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          {tokens.map((t) => (
            <div key={t.label} className="px-5 py-4">
              <p className="tabular text-2xl font-extrabold tracking-[-0.02em]">{formatTokens(t.value)}</p>
              <p className="mt-1 text-xs text-muted">{t.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Очередь модерации */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold tracking-[-0.01em]">
          На модерации
          {s.moderationPending > 0 && (
            <span className="tabular ml-2 rounded-full bg-danger px-2 py-0.5 text-xs font-bold text-white">
              {s.moderationPending}
            </span>
          )}
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {queue.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="group flex items-center justify-between gap-3 rounded-md border border-border bg-surface p-4 shadow-xs transition-colors hover:border-border-strong"
            >
              <div>
                <span className="flex size-9 items-center justify-center rounded-sm bg-primary-soft text-primary ring-1 ring-inset ring-primary/15">
                  <q.icon className="size-[1.125rem]" weight="duotone" aria-hidden />
                </span>
                <p className="mt-3 text-sm font-semibold">{q.label}</p>
              </div>
              <div className="text-right">
                <span className="tabular text-2xl font-extrabold">{q.value}</span>
                <ArrowRight className="ml-auto mt-1 size-4 text-muted transition-transform group-hover:translate-x-0.5" weight="bold" aria-hidden />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
