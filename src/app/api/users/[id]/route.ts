import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { computeProfileCompletion } from "@/server/tokens/profileRules";
import { parsePrivacy, parseSocialLinks } from "@/lib/validators/profile";

/**
 * GET /api/users/[id] — публичный профиль с учётом настроек приватности.
 * Владельцу отдаём всё; чужим скрываем contactPhone/socialLinks, если
 * соответствующие переключатели выключены.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/users/[id]">,
) {
  const { id } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: { level: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === id;
  const privacy = parsePrivacy(user.privacy);

  const showContacts = isOwner || privacy.contacts;
  const showSocials = isOwner || privacy.socials;

  const publicProfile = {
    id: user.id,
    displayName: user.displayName,
    nickname: user.nickname,
    avatarUrl: user.avatarUrl,
    city: user.city,
    bio: user.bio,
    interests: user.interests,
    role: user.role,
    level: user.level
      ? { name: user.level.name, order: user.level.order }
      : null,
    balance: user.cachedBalance,
    completion: computeProfileCompletion(user),
    contactPhone: showContacts ? user.contactPhone : null,
    socialLinks: showSocials ? parseSocialLinks(user.socialLinks) : [],
    createdAt: user.createdAt,
  };

  return NextResponse.json({ user: publicProfile, isOwner });
}
