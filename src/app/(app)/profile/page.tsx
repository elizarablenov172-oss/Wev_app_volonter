import { requireUser } from "@/server/auth";
import { PagePlaceholder } from "@/components/layout/page-placeholder";

export default async function ProfilePage() {
  const user = await requireUser();
  return (
    <PagePlaceholder
      title="Профиль"
      description={`${user.displayName} · соц-профиль, интересы, бейджи и история активности появятся на следующем этапе.`}
    />
  );
}
