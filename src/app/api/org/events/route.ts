import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { eventCreateSchema } from "@/lib/validators/events";

/**
 * GET /api/org/events — все мероприятия своей организации (любые статусы),
 * с числом активных участников.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Доступ только для организаций" }, { status: 403 });
  }

  const organization = await prisma.organization.findUnique({
    where: { userId: auth.id },
    select: { id: true },
  });
  if (!organization) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  const events = await prisma.event.findMany({
    where: { organizationId: organization.id },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      location: true,
      category: true,
      capacity: true,
      rewardTokens: true,
      status: true,
      createdAt: true,
      _count: {
        select: { participations: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  const items = events.map(({ _count, ...e }) => ({
    ...e,
    participantsCount: _count.participations,
  }));

  return NextResponse.json({ items });
}

/**
 * POST /api/org/events — создание мероприятия.
 *
 * Организация должна быть APPROVED. Статус нового события → PENDING (на
 * модерацию админом, который позже назначит rewardTokens). Генерируется
 * qrSecret для будущего QR-чек-ина.
 */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Доступ только для организаций" }, { status: 403 });
  }

  const organization = await prisma.organization.findUnique({
    where: { userId: auth.id },
    select: { id: true, status: true },
  });
  if (!organization) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }
  if (organization.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Создавать мероприятия может только подтверждённая организация" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = eventCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля мероприятия", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const event = await prisma.event.create({
    data: {
      organizationId: organization.id,
      title: input.title,
      description: input.description,
      startsAt: new Date(input.startsAt),
      location: input.location,
      geoLat: input.geoLat ?? null,
      geoLng: input.geoLng ?? null,
      capacity: input.capacity,
      category: input.category,
      status: "PENDING", // на модерацию
      qrSecret: randomUUID(),
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
