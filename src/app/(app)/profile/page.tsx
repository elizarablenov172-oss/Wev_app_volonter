import { requireUser } from "@/server/auth";
import { prisma } from "@/lib/prisma";
import { computeProfileCompletion } from "@/server/tokens/profileRules";
import { ProfileHeader } from "@/components/domain/profile-header";
import { ProfileCompletion } from "@/components/domain/profile-completion";
import { ProfileTabs } from "@/components/domain/profile-tabs";

export default async function ProfilePage() {
  const user = await requireUser();

  // Уровень и счётчики тянем напрямую из Prisma (server component).
  const [level, eventsCount, friendsCount] = await Promise.all([
    user.levelId
      ? prisma.level.findUnique({
          where: { id: user.levelId },
          select: { name: true },
        })
      : Promise.resolve(null),
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

  const completion = computeProfileCompletion(user);

  return (
    // ПК (≥lg): две колонки — узкая «липкая» панель личности + широкая лента.
    // Телефон/планшет (<lg): одна колонка, всё стопкой.
    <div className="lg:grid lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start lg:gap-6">
      {/* Левая колонка — личность (липкая на ПК) */}
      <div className="space-y-5 lg:sticky lg:top-20">
        <ProfileHeader
          layout="compact"
          displayName={user.displayName}
          nickname={user.nickname}
          avatarUrl={user.avatarUrl}
          city={user.city}
          levelName={level?.name}
          isOwner
          stats={{
            events: eventsCount,
            friends: friendsCount,
            balance: user.cachedBalance,
          }}
        />

        {completion < 100 && (
          <ProfileCompletion value={completion} editHref="/profile/edit" />
        )}

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
      </div>

      {/* Правая колонка — активность */}
      <div className="mt-5 lg:mt-0">
        <ProfileTabs userId={user.id} isOwner />
      </div>
    </div>
  );
}
