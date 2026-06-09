import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { parsePrivacy } from "@/lib/validators/profile";

const FEED_LIMIT = 50;

/**
 * GET /api/profile/feed?userId= — лента активности пользователя.
 *
 * Уважает приватность: владелец видит всё; чужие — только PUBLIC-записи.
 * Если лента профиля PRIVATE — чужим отдаём пусто; FRIENDS (для MVP)
 * приравниваем к «только PUBLIC».
 */
export async function GET(request: NextRequest) {
  const targetUserId = request.nextUrl.searchParams.get("userId");
  if (!targetUserId) {
    return NextResponse.json(
      { error: "Не указан userId" },
      { status: 400 },
    );
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, privacy: true },
  });
  if (!targetUser) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === targetUserId;

  // Владелец видит все записи.
  if (isOwner) {
    const items = await prisma.activityFeedItem.findMany({
      where: { userId: targetUserId },
      orderBy: { createdAt: "desc" },
      take: FEED_LIMIT,
    });
    return NextResponse.json({ items });
  }

  // Чужой зритель: учитываем приватность ленты.
  const privacy = parsePrivacy(targetUser.privacy);
  if (privacy.feed === "PRIVATE") {
    return NextResponse.json({ items: [] });
  }

  // PUBLIC и FRIENDS (MVP) → отдаём только PUBLIC-записи.
  const items = await prisma.activityFeedItem.findMany({
    where: { userId: targetUserId, visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    take: FEED_LIMIT,
  });

  return NextResponse.json({ items });
}
