import { requireRole } from "@/server/auth";
import { getTokensLog } from "@/server/admin/queries";
import { PageHeader } from "@/components/layout/page-header";
import { TokenAmount } from "@/components/domain/token-amount";
import { userDisplay } from "@/lib/missions";

const TX_LABEL: Record<string, string> = {
  EARN_EVENT: "Мероприятие",
  EARN_PROFILE: "Профиль",
  EARN_MISSION: "Задание",
  EARN_BONUS: "Бонус",
  SPEND_REWARD: "Награда",
  REFUND: "Возврат",
  ADMIN_ADJUST: "Коррекция",
};

const DATE_FMT = new Intl.DateTimeFormat("ru-RU", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function AdminTokensLogPage() {
  await requireRole(["ADMIN"]);
  const rows = await getTokensLog({});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Журнал операций с токенами"
        description="Кто, за что и когда получил или потратил токены (ТЗ 3.14). Последние 100 операций."
      />

      {rows.length === 0 ? (
        <p className="rounded-md border border-border bg-surface px-4 py-6 text-center text-sm text-muted">
          Операций пока нет.
        </p>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-xs">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-[0.04em] text-muted">
                <th className="px-4 py-2.5 font-semibold">Дата</th>
                <th className="px-4 py-2.5 font-semibold">Пользователь</th>
                <th className="hidden px-4 py-2.5 font-semibold sm:table-cell">Тип</th>
                <th className="hidden px-4 py-2.5 font-semibold md:table-cell">Причина</th>
                <th className="px-4 py-2.5 text-right font-semibold">Сумма</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-border last:border-b-0">
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                    {DATE_FMT.format(new Date(r.createdAt))}
                  </td>
                  <td className="px-4 py-2.5">{userDisplay(r.user)}</td>
                  <td className="hidden px-4 py-2.5 text-muted sm:table-cell">
                    {TX_LABEL[r.type] ?? r.type}
                  </td>
                  <td className="hidden max-w-xs truncate px-4 py-2.5 text-muted md:table-cell">
                    {r.reason}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <TokenAmount value={Math.abs(r.amount)} sign={r.amount < 0 ? "minus" : "plus"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
