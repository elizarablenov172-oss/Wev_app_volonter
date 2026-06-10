import { CalendarDots } from "@phosphor-icons/react/dist/ssr";
import { getPublicEvents } from "@/server/events/queries";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/domain/empty-state";
import { EventCard } from "@/components/domain/event-card";
import { EventFilterBar } from "@/components/domain/event-filter-bar";
import { EventsPagination } from "@/components/domain/events-pagination";

interface EventsPageProps {
  searchParams: Promise<{
    city?: string;
    category?: string;
    date?: string;
    page?: string;
  }>;
}

/**
 * Каталог волонтёрских мероприятий (PUBLISHED) с фильтрами через query.
 * ПК: сетка 2–3 колонки во всю ширину; телефон: одна колонка.
 */
export default async function EventsPage({ searchParams }: EventsPageProps) {
  const sp = await searchParams;
  // Любой авторизованный пользователь видит каталог (доступ гарантирует (app)/layout).
  const page = Number.parseInt(sp.page ?? "1", 10);
  const data = await getPublicEvents({
    city: sp.city,
    category: sp.category,
    date: sp.date,
    page: Number.isNaN(page) ? 1 : page,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Мероприятия"
        description="Найдите волонтёрское событие рядом, запишитесь и получайте токены за участие."
      />

      <EventFilterBar
        initialCity={sp.city ?? ""}
        initialCategory={sp.category ?? ""}
        initialDate={sp.date ?? ""}
      />

      {data.items.length === 0 ? (
        <EmptyState
          icon={CalendarDots}
          title="Мероприятий не найдено"
          description="Попробуйте изменить фильтры или загляните позже — организации регулярно публикуют новые события."
        />
      ) : (
        <>
          <p className="text-sm text-muted">
            Найдено мероприятий: <span className="font-semibold text-foreground">{data.total}</span>
          </p>
          {/* ПК (≥xl): 3 колонки; планшет (md): 2; телефон: 1. Во всю ширину. */}
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {data.items.map((event) => (
              <li key={event.id}>
                <EventCard event={event} />
              </li>
            ))}
          </ul>
          {data.totalPages > 1 && (
            <EventsPagination page={data.page} totalPages={data.totalPages} />
          )}
        </>
      )}
    </div>
  );
}
