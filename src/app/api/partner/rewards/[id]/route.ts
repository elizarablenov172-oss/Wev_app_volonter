import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { getOwnedPartner } from "@/server/rewards/redemption";
import { rewardUpdateSchema } from "@/lib/validators/rewards";

/** PATCH /api/partner/rewards/[id] — редактировать свою награду. */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/partner/rewards/[id]">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARTNER") {
    return NextResponse.json({ error: "Только для партнёра" }, { status: 403 });
  }

  const partner = await getOwnedPartner(auth.id);
  if (!partner) {
    return NextResponse.json({ error: "Профиль партнёра не найден" }, { status: 404 });
  }

  const { id } = await ctx.params;
  const reward = await prisma.reward.findUnique({ where: { id } });
  if (!reward || reward.partnerId !== partner.id) {
    return NextResponse.json({ error: "Награда не найдена" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = rewardUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля награды", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const d = parsed.data;

  const data: Prisma.RewardUpdateInput = {};
  if (d.title !== undefined) data.title = d.title;
  if (d.description !== undefined) data.description = d.description;
  if (d.type !== undefined) data.type = d.type;
  if (d.costTokens !== undefined) data.costTokens = d.costTokens;
  if (d.stock !== undefined) data.stock = d.stock ?? null;
  if (d.expiresAt !== undefined) data.expiresAt = d.expiresAt ? new Date(d.expiresAt) : null;
  if (d.conditions !== undefined) data.conditions = d.conditions ?? null;
  if (d.imageUrl !== undefined) data.imageUrl = d.imageUrl ?? null;
  if (d.requiresApproval !== undefined) data.requiresApproval = d.requiresApproval;
  if (d.isActive !== undefined) data.isActive = d.isActive;

  const updated = await prisma.reward.update({ where: { id }, data });
  return NextResponse.json({ reward: updated });
}
