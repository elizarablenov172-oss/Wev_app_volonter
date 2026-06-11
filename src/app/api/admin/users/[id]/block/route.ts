import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/** POST /api/admin/users/[id]/block { blocked: boolean } — блокировка/разблокировка. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/users/[id]/block">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const { id } = await ctx.params;
  if (id === auth.id) {
    return NextResponse.json({ error: "Нельзя заблокировать себя" }, { status: 409 });
  }

  const body = await request.json().catch(() => ({}));
  const blocked = Boolean(body?.blocked);

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Нельзя заблокировать администратора" }, { status: 409 });
  }

  await prisma.user.update({ where: { id }, data: { isBlocked: blocked } });
  await prisma.adminAuditLog.create({
    data: {
      adminId: auth.id,
      action: blocked ? "BLOCK_USER" : "UNBLOCK_USER",
      targetType: "user",
      targetId: id,
    },
  });

  return NextResponse.json({ ok: true, blocked });
}
