import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * GET /api/admin/events/moderation — очередь мероприятий на модерации (PENDING).
 * Только ADMIN. Возвращает событие + организацию для принятия решения.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }

  const events = await prisma.event.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      location: true,
      category: true,
      capacity: true,
      rewardTokens: true,
      createdAt: true,
      organization: { select: { id: true, name: true, status: true } },
    },
  });

  return NextResponse.json({ items: events });
}
