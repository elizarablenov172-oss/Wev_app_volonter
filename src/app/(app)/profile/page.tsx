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
    <div className="mx-auto max-w-2xl space-y-5">
      <ProfileHeader
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

      <ProfileTabs userId={user.id} isOwner />
    </div>
  );
}
