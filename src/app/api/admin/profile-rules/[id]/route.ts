import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

const schema = z
  .object({
    tokens: z.coerce.number().int().min(0).optional(),
    limitCount: z.coerce.number().int().min(1).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .partial();

/** PATCH /api/admin/profile-rules/[id] — настройка правил начисления за профиль (3.9). */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/profile-rules/[id]">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте значения", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const rule = await prisma.profileCompletionRule.findUnique({ where: { id } });
  if (!rule) {
    return NextResponse.json({ error: "Правило не найдено" }, { status: 404 });
  }

  const data: Prisma.ProfileCompletionRuleUpdateInput = {};
  if (parsed.data.tokens !== undefined) data.tokens = parsed.data.tokens;
  if (parsed.data.limitCount !== undefined) data.limitCount = parsed.data.limitCount;
  if (parsed.data.isActive !== undefined) data.isActive = parsed.data.isActive;

  const updated = await prisma.profileCompletionRule.update({ where: { id }, data });
  await prisma.adminAuditLog.create({
    data: { adminId: auth.id, action: "UPDATE_PROFILE_RULE", targetType: "profileRule", targetId: id, meta: { ...parsed.data } },
  });

  return NextResponse.json({ rule: updated });
}
