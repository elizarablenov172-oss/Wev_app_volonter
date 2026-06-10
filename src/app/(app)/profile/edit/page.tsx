import Link from "next/link";
import { CaretLeft } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/server/auth";
import {
  parsePrivacy,
  parseSocialLinks,
} from "@/lib/validators/profile";
import {
  ProfileEditForm,
  type ProfileEditInitial,
} from "@/components/domain/profile-edit-form";

export default async function ProfileEditPage() {
  const user = await requireUser();

  const initial: ProfileEditInitial = {
    displayName: user.displayName,
    nickname: user.nickname ?? "",
    city: user.city ?? "",
    bio: user.bio ?? "",
    contactPhone: user.contactPhone ?? "",
    avatarUrl: user.avatarUrl,
    interests: user.interests ?? [],
    socialLinks: parseSocialLinks(user.socialLinks),
    privacy: parsePrivacy(user.privacy),
  };

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="space-y-1">
        <Link
          href="/profile"
          className="inline-flex items-center gap-1 text-sm font-semibold text-muted transition-colors hover:text-foreground"
        >
          <CaretLeft className="size-4" weight="bold" aria-hidden />
          К профилю
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">
          Редактирование профиля
        </h1>
        <p className="text-sm text-muted">
          Заполните профиль и получайте Social Tokens за каждый раздел.
        </p>
      </div>

      <ProfileEditForm initial={initial} />
    </div>
  );
}
