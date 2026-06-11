import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/** POST /api/admin/partners/[id]/moderate { action, reason? } — верификация партнёра. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/partners/[id]/moderate">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const action = body?.action;
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Некорректное действие" }, { status: 400 });
  }

  const partner = await prisma.partner.findUnique({ where: { id }, select: { userId: true, brandName: true } });
  if (!partner) {
    return NextResponse.json({ error: "Партнёр не найден" }, { status: 404 });
  }

  const status = action === "approve" ? "APPROVED" : "REJECTED";
  await prisma.partner.update({ where: { id }, data: { status } });
  await prisma.adminAuditLog.create({
    data: {
      adminId: auth.id,
      action: action === "approve" ? "APPROVE_PARTNER" : "REJECT_PARTNER",
      targetType: "partner",
      targetId: id,
      meta: { reason: body?.reason ?? null },
    },
  });
  await prisma.notification.create({
    data: {
      userId: partner.userId,
      type: "EVENT",
      title: action === "approve" ? "Партнёр подтверждён" : "Партнёр отклонён",
      body:
        action === "approve"
          ? `Бренд «${partner.brandName}» верифицирован — можно публиковать награды.`
          : `Бренд «${partner.brandName}» отклонён администратором.`,
      refType: "partner",
      refId: id,
    },
  });

  return NextResponse.json({ ok: true, status });
}
