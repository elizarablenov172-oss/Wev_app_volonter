import { notFound, redirect } from "next/navigation";
import { Link as LinkIcon, Phone } from "lucide-react";
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
    <div className="mx-auto max-w-2xl space-y-5">
      <ProfileHeader
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
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-2 text-sm font-bold text-muted">О себе</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
            {user.bio}
          </p>
        </div>
      )}

      {user.interests.length > 0 && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-muted">Интересы</h2>
          <ul className="flex flex-wrap gap-2">
            {user.interests.map((tag) => (
              <li key={tag}>
                <span className="inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary">
                  {tag}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {hasContactsBlock && (
        <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-bold text-muted">Контакты</h2>
          <ul className="space-y-2">
            {showContacts && user.contactPhone && (
              <li className="flex items-center gap-2 text-sm">
                <Phone className="size-4 text-muted" aria-hidden />
                <a
                  href={`tel:${user.contactPhone}`}
                  className="font-semibold text-primary hover:underline"
                >
                  {user.contactPhone}
                </a>
              </li>
            )}
            {socialLinks.map((link, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <LinkIcon className="size-4 text-muted" aria-hidden />
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
        </div>
      )}

      {/* Лента — только PUBLIC (API сам отдаёт пусто, если не PUBLIC). */}
      {privacy.feed === "PUBLIC" && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold">Активность</h2>
          <ActivityFeed userId={user.id} isOwner={false} />
        </div>
      )}
    </div>
  );
}
