import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * POST /api/events/[id]/join — запись волонтёра на мероприятие.
 *
 * Проверки: роль VOLUNTEER; событие PUBLISHED; не превышена capacity (по
 * активным участиям); нет действующего участия (повторная запись разрешена
 * только из статуса CANCELLED). Создаёт Participation(REGISTERED) и запись
 * в ленту активности EVENT_JOIN. Конфликты → 409.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/events/[id]/join">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Записаться на мероприятие может только волонтёр" },
      { status: 403 },
    );
  }

  const { id: eventId } = await ctx.params;

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, status: true, capacity: true },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.status !== "PUBLISHED") {
    return NextResponse.json(
      { error: "Запись на это мероприятие недоступна" },
      { status: 409 },
    );
  }

  try {
    const participation = await prisma.$transaction(async (tx) => {
      // Существующее участие (с учётом @@unique([userId, eventId])).
      const existing = await tx.participation.findUnique({
        where: { userId_eventId: { userId: auth.id, eventId } },
      });
      if (existing && existing.status !== "CANCELLED") {
        throw new ConflictError("Вы уже записаны на это мероприятие");
      }

      // Контроль вместимости по активным участиям.
      const activeCount = await tx.participation.count({
        where: { eventId, status: { not: "CANCELLED" } },
      });
      if (activeCount >= event.capacity) {
        throw new ConflictError("Свободных мест больше нет");
      }

      // Повторная запись из CANCELLED — реанимируем существующую строку.
      if (existing) {
        return tx.participation.update({
          where: { id: existing.id },
          data: {
            status: "REGISTERED",
            checkInMethod: null,
            checkedInAt: null,
            confirmedById: null,
            // rewarded НЕ сбрасываем: если уже была награда — повторно не выдаём.
          },
        });
      }

      return tx.participation.create({
        data: { userId: auth.id, eventId, status: "REGISTERED" },
      });
    });

    // Лента активности — вне транзакции записи (не критично для целостности).
    await prisma.activityFeedItem.create({
      data: {
        userId: auth.id,
        type: "EVENT_JOIN",
        refType: "event",
        refId: eventId,
        text: `Записался(ась) на «${event.title}»`,
        visibility: "PUBLIC",
      },
    });

    return NextResponse.json(
      {
        participation: {
          id: participation.id,
          status: participation.status,
          eventId: participation.eventId,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // Гонка по уникальному индексу (двойной клик) — трактуем как дубль.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Вы уже записаны на это мероприятие" },
        { status: 409 },
      );
    }
    throw error;
  }
}

/** Внутренняя ошибка-сигнал для отката транзакции с человекочитаемым текстом. */
class ConflictError extends Error {}
