import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * GET /api/org/events/[id]/participants — список участников своего события.
 * Только владелец-организация. Возвращает имя, статус, способ/время чек-ина.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/org/events/[id]/participants">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Доступ только для организаций" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      capacity: true,
      organization: { select: { userId: true } },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.organization.userId !== auth.id) {
    return NextResponse.json({ error: "Это не ваше мероприятие" }, { status: 403 });
  }

  const participations = await prisma.participation.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      checkInMethod: true,
      checkedInAt: true,
      rewarded: true,
      createdAt: true,
      user: {
        select: { id: true, displayName: true, nickname: true, avatarUrl: true, city: true },
      },
    },
  });

  const items = participations.map((p) => ({
    participationId: p.id,
    status: p.status,
    checkInMethod: p.checkInMethod,
    checkedInAt: p.checkedInAt,
    rewarded: p.rewarded,
    joinedAt: p.createdAt,
    user: p.user,
  }));

  const activeCount = items.filter((p) => p.status !== "CANCELLED").length;

  return NextResponse.json({
    event: { id: event.id, title: event.title, capacity: event.capacity },
    participantsCount: activeCount,
    items,
  });
}
