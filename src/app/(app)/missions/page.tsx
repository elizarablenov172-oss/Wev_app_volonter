import { ListChecks } from "@phosphor-icons/react/dist/ssr";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default function MissionsPage() {
  return (
    <PagePlaceholder
      icon={ListChecks}
      title="Задания"
      description="Цифровые задания за токены: выполнение, загрузка пруфа и модерация — на этапе «Задания»."
    />
  );
}
