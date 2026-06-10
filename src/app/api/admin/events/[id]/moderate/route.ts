import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { eventModerationSchema } from "@/lib/validators/events";

/**
 * POST /api/admin/events/[id]/moderate — модерация мероприятия админом.
 *
 * body: { action:'approve', rewardTokens>0, reason? } | { action:'reject', reason? }.
 * approve → PUBLISHED + назначенные rewardTokens; reject → REJECTED.
 * Любое решение фиксируется в AdminAuditLog; организации шлётся уведомление.
 * Модерировать можно только событие в статусе PENDING.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/events/[id]/moderate">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Доступ только для администратора" }, { status: 403 });
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = eventModerationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте решение модерации", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const decision = parsed.data;

  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      organization: { select: { id: true, userId: true } },
    },
  });
  if (!event) {
    return NextResponse.json({ error: "Мероприятие не найдено" }, { status: 404 });
  }
  if (event.status !== "PENDING") {
    return NextResponse.json(
      { error: "Модерировать можно только мероприятия со статусом «на модерации»" },
      { status: 409 },
    );
  }

  if (decision.action === "approve") {
    const updated = await prisma.$transaction(async (tx) => {
      const ev = await tx.event.update({
        where: { id },
        data: { status: "PUBLISHED", rewardTokens: decision.rewardTokens },
      });
      await tx.adminAuditLog.create({
        data: {
          adminId: auth.id,
          action: "APPROVE_EVENT",
          targetType: "event",
          targetId: id,
          meta: {
            rewardTokens: decision.rewardTokens,
            reason: decision.reason ?? null,
          },
        },
      });
      await tx.notification.create({
        data: {
          userId: event.organization.userId,
          type: "EVENT",
          title: "Мероприятие одобрено",
          body: `«${event.title}» опубликовано. Награда за участие: ${decision.rewardTokens} токенов.`,
          refType: "event",
          refId: id,
        },
      });
      return ev;
    });

    return NextResponse.json({ event: updated });
  }

  // reject
  const updated = await prisma.$transaction(async (tx) => {
    const ev = await tx.event.update({
      where: { id },
      data: { status: "REJECTED" },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId: auth.id,
        action: "REJECT_EVENT",
        targetType: "event",
        targetId: id,
        meta: { reason: decision.reason ?? null },
      },
    });
    await tx.notification.create({
      data: {
        userId: event.organization.userId,
        type: "EVENT",
        title: "Мероприятие отклонено",
        body: decision.reason
          ? `«${event.title}» отклонено: ${decision.reason}`
          : `«${event.title}» отклонено модератором.`,
        refType: "event",
        refId: id,
      },
    });
    return ev;
  });

  return NextResponse.json({ event: updated });
}
