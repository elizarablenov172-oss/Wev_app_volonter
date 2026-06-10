import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import {
  confirmParticipation,
  ParticipationError,
} from "@/server/events/participation";

/**
 * POST /api/org/events/[id]/participants/[uid]/confirm — ручное подтверждение
 * участия организацией (способ ORG_CONFIRM).
 *
 * Только владелец-событие организация. Переводит участие в CONFIRMED и
 * начисляет награду (идемпотентно). [uid] — id пользователя-волонтёра.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/org/events/[id]/participants/[uid]/confirm">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Доступ только для организаций" }, { status: 403 });
  }

  const { id: eventId, uid } = await ctx.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, organization: { select: { userId: true } } },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.organization.userId !== auth.id) {
    return NextResponse.json({ error: "Это не ваше мероприятие" }, { status: 403 });
  }

  try {
    const result = await confirmParticipation({
      userId: uid,
      eventId,
      method: "ORG_CONFIRM",
      confirmedById: auth.id,
    });
    return NextResponse.json({
      participation: {
        id: result.participation.id,
        userId: result.participation.userId,
        status: result.participation.status,
        checkInMethod: result.participation.checkInMethod,
        checkedInAt: result.participation.checkedInAt,
        rewarded: result.participation.rewarded,
      },
      awarded: result.awarded,
    });
  } catch (error) {
    if (error instanceof ParticipationError) {
      const status =
        error.code === "NOT_FOUND" || error.code === "EVENT_NOT_FOUND" ? 404 : 409;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
