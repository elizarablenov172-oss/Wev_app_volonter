import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * GET /api/org/events/[id]/qr — payload для генерации QR-кода чек-ина.
 *
 * Только владелец-организация. Возвращает { eventId, qrSecret } — фронт
 * кодирует это в QR, волонтёр сканирует и шлёт qrSecret в /checkin.
 * Если qrSecret почему-то отсутствует (старые/seed-события) — генерируем.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/org/events/[id]/qr">,
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
      qrSecret: true,
      organization: { select: { userId: true } },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.organization.userId !== auth.id) {
    return NextResponse.json({ error: "Это не ваше мероприятие" }, { status: 403 });
  }

  // Ленивая генерация секрета, если его нет.
  let qrSecret = event.qrSecret;
  if (!qrSecret) {
    qrSecret = randomUUID();
    await prisma.event.update({ where: { id }, data: { qrSecret } });
  }

  return NextResponse.json({
    eventId: event.id,
    title: event.title,
    qrSecret,
    // Готовая строка для кодирования в QR (фронт может использовать как есть).
    payload: JSON.stringify({ eventId: event.id, qrSecret }),
  });
}
