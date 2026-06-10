import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { checkInSchema, GEO_CHECKIN_RADIUS_M } from "@/lib/validators/events";
import {
  confirmParticipation,
  haversineMeters,
  ParticipationError,
} from "@/server/events/participation";

/**
 * POST /api/events/[id]/checkin — самостоятельный чек-ин волонтёра.
 *
 * body: { method: 'QR', qrSecret } | { method: 'GEO', lat, lng }.
 * Нужно действующее участие (REGISTERED). Проверка QR-секрета / гео-радиуса
 * выполняется СТРОГО на сервере. При успехе участие → CONFIRMED + награда
 * (через confirmParticipation, идемпотентно).
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/events/[id]/checkin">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Чек-ин доступен только волонтёру" },
      { status: 403 },
    );
  }

  const { id: eventId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = checkInSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте данные чек-ина", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, status: true, qrSecret: true, geoLat: true, geoLng: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Чек-ин на это мероприятие недоступен" },
      { status: 409 },
    );
  }

  // Участие должно существовать и быть действующим.
  const participation = await prisma.participation.findUnique({
    where: { userId_eventId: { userId: auth.id, eventId } },
  });
  if (!participation) {
    return NextResponse.json(
      { error: "Сначала запишитесь на мероприятие" },
      { status: 404 },
    );
  }
  if (participation.status === "CANCELLED" || participation.status === "NO_SHOW") {
    return NextResponse.json(
      { error: "Участие отменено — чек-ин невозможен" },
      { status: 409 },
    );
  }
  if (participation.status === "CONFIRMED" || participation.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Участие уже подтверждено" },
      { status: 409 },
    );
  }

  // Серверная проверка способа чек-ина.
  if (input.method === "QR") {
    if (!event.qrSecret || input.qrSecret !== event.qrSecret) {
      return NextResponse.json(
        { error: "Неверный QR-код мероприятия" },
        { status: 422 },
      );
    }
  } else {
    // GEO
    if (event.geoLat == null || event.geoLng == null) {
      return NextResponse.json(
        { error: "Для этого мероприятия гео-чек-ин недоступен" },
        { status: 422 },
      );
    }
    const distance = haversineMeters(
      input.lat,
      input.lng,
      event.geoLat,
      event.geoLng,
    );
    if (distance > GEO_CHECKIN_RADIUS_M) {
      return NextResponse.json(
        {
          error: "Вы слишком далеко от места проведения",
          distanceMeters: Math.round(distance),
          radiusMeters: GEO_CHECKIN_RADIUS_M,
        },
        { status: 422 },
      );
    }
  }

  // Подтверждение + начисление (идемпотентно).
  try {
    const result = await confirmParticipation({
      participationId: participation.id,
      method: input.method,
    });
    return NextResponse.json({
      participation: {
        id: result.participation.id,
        status: result.participation.status,
        checkInMethod: result.participation.checkInMethod,
        checkedInAt: result.participation.checkedInAt,
        rewarded: result.participation.rewarded,
      },
      awarded: result.awarded,
      balance: result.balance,
    });
  } catch (error) {
    if (error instanceof ParticipationError) {
      const status = error.code === "WRONG_STATUS" ? 409 : 404;
      return NextResponse.json({ error: error.message }, { status });
    }
    throw error;
  }
}
