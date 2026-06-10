import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";

/**
 * GET /api/events/[id] — детали мероприятия.
 *
 * Возвращает событие + организацию + число записавшихся (активных). Если
 * запрос авторизован — добавляет статус участия текущего пользователя.
 * Черновики/на модерации/отклонённые видит только их организация.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/events/[id]">,
) {
  const { id } = await ctx.params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      location: true,
      geoLat: true,
      geoLng: true,
      capacity: true,
      category: true,
      rewardTokens: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { id: true, userId: true, name: true, description: true },
      },
      _count: {
        select: { participations: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === event.organization.userId;

  // Неопубликованные события доступны только их организации.
  if (event.status !== "PUBLISHED" && !isOwner) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }

  // Статус участия текущего пользователя (если авторизован).
  let myParticipation = null;
  if (viewer) {
    const p = await prisma.participation.findUnique({
      where: { userId_eventId: { userId: viewer.id, eventId: id } },
      select: {
        id: true,
        status: true,
        checkInMethod: true,
        checkedInAt: true,
        rewarded: true,
      },
    });
    myParticipation = p;
  }

  const { _count, organization, ...rest } = event;
  const participantsCount = _count.participations;

  return NextResponse.json({
    event: {
      ...rest,
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      },
      participantsCount,
      spotsLeft: Math.max(0, event.capacity - participantsCount),
    },
    isOwner,
    myParticipation,
  });
}
