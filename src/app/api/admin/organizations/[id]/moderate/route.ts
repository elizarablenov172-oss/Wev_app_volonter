import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/** POST /api/admin/organizations/[id]/moderate { action, reason? } — верификация организации. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/organizations/[id]/moderate">,
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

  const org = await prisma.organization.findUnique({ where: { id }, select: { userId: true, name: true } });
  if (!org) {
    return NextResponse.json({ error: "Организация не найдена" }, { status: 404 });
  }

  const status = action === "approve" ? "APPROVED" : "REJECTED";
  await prisma.organization.update({ where: { id }, data: { status } });
  await prisma.adminAuditLog.create({
    data: {
      adminId: auth.id,
      action: action === "approve" ? "APPROVE_ORG" : "REJECT_ORG",
      targetType: "organization",
      targetId: id,
      meta: { reason: body?.reason ?? null },
    },
  });
  await prisma.notification.create({
    data: {
      userId: org.userId,
      type: "EVENT",
      title: action === "approve" ? "Организация подтверждена" : "Организация отклонена",
      body:
        action === "approve"
          ? `«${org.name}» верифицирована — можно создавать мероприятия.`
          : `«${org.name}» отклонена администратором.`,
      refType: "organization",
      refId: id,
    },
  });

  return NextResponse.json({ ok: true, status });
}
