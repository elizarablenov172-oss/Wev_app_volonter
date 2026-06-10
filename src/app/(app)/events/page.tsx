import { CalendarDots } from "@phosphor-icons/react/dist/ssr";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function EventsPage() {
  return (
    <PagePlaceholder
      icon={CalendarDots}
      title="Мероприятия"
      description="Каталог волонтёрских мероприятий, фильтры, запись и чек-ин — на этапе «Мероприятия»."
    />
  );
}
