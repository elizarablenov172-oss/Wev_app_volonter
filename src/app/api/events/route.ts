import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { eventListQuerySchema } from "@/lib/validators/events";

/**
 * GET /api/events — публичный список PUBLISHED-мероприятий.
 *
 * Фильтры (query): city (подстрока локации), category (точно), date (на дату
 * и позже). По умолчанию показываются только актуальные (startsAt ≥ сейчас).
 * Пагинация: page / pageSize.
 */
export async function GET(request: NextRequest) {
  const parsed = eventListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные параметры фильтра", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { city, category, date, page, pageSize } = parsed.data;

  // Нижняя граница по дате: указанная дата (начало суток) либо «сейчас».
  let fromDate = new Date();
  if (date) {
    const parsedDate = new Date(date);
    if (!Number.isNaN(parsedDate.getTime())) {
      parsedDate.setHours(0, 0, 0, 0);
      fromDate = parsedDate;
    }
  }

  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    startsAt: { gte: fromDate },
  };
  if (city) where.location = { contains: city, mode: "insensitive" };
  if (category) where.category = category;

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
        organization: { select: { id: true, name: true } },
        _count: {
          select: { participations: { where: { status: { not: "CANCELLED" } } } },
        },
      },
    }),
  ]);

  const items = events.map((e) => {
    const { _count, ...rest } = e;
    return {
      ...rest,
      participantsCount: _count.participations,
      spotsLeft: Math.max(0, e.capacity - _count.participations),
    };
  });

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
