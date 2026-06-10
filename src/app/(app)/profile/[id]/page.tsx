import { notFound, redirect } from "next/navigation";
import { LinkSimple, Phone } from "@phosphor-icons/react/dist/ssr";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { parsePrivacy, parseSocialLinks } from "@/lib/validators/profile";
import { ProfileHeader } from "@/components/domain/profile-header";
import { ActivityFeed } from "@/components/domain/activity-feed";

const PLATFORM_LABEL: Record<string, string> = {
  telegram: "Telegram",
  vk: "ВКонтакте",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
  website: "Сайт",
  other: "Ссылка",
};

export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const viewer = await getCurrentUser();
  // Свой профиль открываем в полном виде.
  if (viewer?.id === id) {
    redirect("/profile");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: { level: true },
  });
  if (!user) notFound();

  // Приватность: чужому зрителю показываем только разрешённое.
  const privacy = parsePrivacy(user.privacy);
  const showContacts = privacy.contacts;
  const showSocials = privacy.socials;
  const socialLinks = showSocials ? parseSocialLinks(user.socialLinks) : [];

  const [eventsCount, friendsCount] = await Promise.all([
    prisma.participation.count({
      where: { userId: user.id, status: "COMPLETED" },
    }),
    prisma.friendship.count({
      where: {
        status: "ACCEPTED",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
    }),
  ]);

  const hasContactsBlock =
    (showContacts && Boolean(user.contactPhone)) || socialLinks.length > 0;

  return (
    // ПК (≥lg): личность слева (липкая), активность справа. Телефон (<lg): стопка.
    <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Левая колонка — личность */}
      <div className="space-y-5 lg:sticky lg:top-20">
        <ProfileHeader
          layout="compact"
          displayName={user.displayName}
          nickname={user.nickname}
          avatarUrl={user.avatarUrl}
          city={user.city}
          levelName={user.level?.name}
          isOwner={false}
          stats={{
            events: eventsCount,
            friends: friendsCount,
            balance: user.cachedBalance,
          }}
        />

        {user.bio && (
          <section className="rounded-lg border border-border bg-surface shadow-xs">
            <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              О себе
            </h2>
            <p className="whitespace-pre-line px-5 py-4 text-sm leading-relaxed text-foreground">
              {user.bio}
            </p>
          </section>
        )}

        {user.interests.length > 0 && (
          <section className="rounded-lg border border-border bg-surface shadow-xs">
            <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              Интересы
            </h2>
            <ul className="flex flex-wrap gap-2 px-5 py-4">
              {user.interests.map((tag) => (
                <li key={tag}>
                  <span className="inline-flex rounded-sm bg-primary-soft px-2.5 py-1 text-sm font-semibold text-primary ring-1 ring-inset ring-primary/15">
                    {tag}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {hasContactsBlock && (
          <section className="rounded-lg border border-border bg-surface shadow-xs">
            <h2 className="border-b border-border px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
              Контакты
            </h2>
            <ul className="divide-y divide-border">
              {showContacts && user.contactPhone && (
                <li className="flex items-center gap-3 px-5 py-3 text-sm">
                  <Phone className="size-4 shrink-0 text-muted" weight="duotone" aria-hidden />
                  <a
                    href={`tel:${user.contactPhone}`}
                    className="font-semibold text-primary hover:underline"
                  >
                    {user.contactPhone}
                  </a>
                </li>
              )}
              {socialLinks.map((link, i) => (
                <li key={i} className="flex items-center gap-3 px-5 py-3 text-sm">
                  <LinkSimple className="size-4 shrink-0 text-muted" weight="duotone" aria-hidden />
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all font-semibold text-primary hover:underline"
                  >
                    {PLATFORM_LABEL[link.platform] ?? link.platform}
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {/* Правая колонка — активность */}
      <div className="mt-5 space-y-3 lg:mt-0">
        <h2 className="text-sm font-bold tracking-[-0.01em]">Активность</h2>
        {privacy.feed === "PUBLIC" ? (
          <ActivityFeed userId={user.id} isOwner={false} />
        ) : (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface px-6 py-10 text-center text-sm text-muted">
            Пользователь скрыл ленту активности настройками приватности.
          </div>
        )}
      </div>
    </div>
  );
}
