import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * POST /api/events/[id]/leave — волонтёр отписывается от мероприятия.
 *
 * Перевод участия REGISTERED/CHECKED_IN → CANCELLED. Нельзя отписаться, если
 * участие уже подтверждено (CONFIRMED/COMPLETED) — токены уже начислены.
 * Место освобождается (capacity считается по не-CANCELLED участиям).
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/events/[id]/leave">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json({ error: "Только для волонтёра" }, { status: 403 });
  }

  const { id: eventId } = await ctx.params;

  const participation = await prisma.participation.findUnique({
    where: { userId_eventId: { userId: auth.id, eventId } },
    select: { id: true, status: true },
  });
  if (!participation || participation.status === "CANCELLED") {
    return NextResponse.json(
      { error: "Вы не записаны на это мероприятие" },
      { status: 409 },
    );
  }
  if (participation.status === "CONFIRMED" || participation.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Участие уже подтверждено — отписаться нельзя" },
      { status: 409 },
    );
  }

  await prisma.participation.update({
    where: { id: participation.id },
    data: { status: "CANCELLED", checkInMethod: null, checkedInAt: null },
  });

  return NextResponse.json({ ok: true });
}
