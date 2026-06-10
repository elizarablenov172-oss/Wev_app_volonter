import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { eventUpdateSchema } from "@/lib/validators/events";

/** Статусы, в которых организация может редактировать своё событие. */
const EDITABLE_STATUSES = ["DRAFT", "PENDING", "REJECTED"] as const;

/**
 * PATCH /api/org/events/[id] — редактирование своего мероприятия.
 *
 * Доступно только владельцу-организации и только в статусах DRAFT/PENDING/
 * REJECTED. После правок отклонённое событие возвращается на модерацию
 * (REJECTED → PENDING). rewardTokens/status организацией не управляются.
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/org/events/[id]">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ORGANIZATION") {
    return NextResponse.json({ error: "Доступ только для организаций" }, { status: 403 });
  }

  const { id } = await ctx.params;

  const event = await prisma.event.findUnique({
    where: { id },
    select: { id: true, status: true, organization: { select: { userId: true } } },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.organization.userId !== auth.id) {
    return NextResponse.json({ error: "Это не ваше мероприятие" }, { status: 403 });
  }
  if (!(EDITABLE_STATUSES as readonly string[]).includes(event.status)) {
    return NextResponse.json(
      { error: "Опубликованное или архивное мероприятие редактировать нельзя" },
      { status: 409 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = eventUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля мероприятия", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const input = parsed.data;

  const data: Prisma.EventUpdateInput = {};
  if (input.title !== undefined) data.title = input.title;
  if (input.description !== undefined) data.description = input.description;
  if (input.startsAt !== undefined) data.startsAt = new Date(input.startsAt);
  if (input.location !== undefined) data.location = input.location;
  if (input.geoLat !== undefined) data.geoLat = input.geoLat;
  if (input.geoLng !== undefined) data.geoLng = input.geoLng;
  if (input.capacity !== undefined) data.capacity = input.capacity;
  if (input.category !== undefined) data.category = input.category;

  // Правки отклонённого события → снова на модерацию.
  if (event.status === "REJECTED") {
    data.status = "PENDING";
  }

  const updated = await prisma.event.update({ where: { id }, data });

  return NextResponse.json({ event: updated });
}
