import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";

/**
 * GET /api/rewards/[id] — детали награды + партнёр.
 *
 * Для авторизованного добавляются: affordable (balance ≥ cost), balance, а
 * также его уже существующие заявки/покупки по этой награде (активные и
 * история) — чтобы фронт показал «уже куплено / на одобрении».
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/rewards/[id]">,
) {
  const { id } = await ctx.params;

  const reward = await prisma.reward.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      costTokens: true,
      stock: true,
      expiresAt: true,
      conditions: true,
      imageUrl: true,
      requiresApproval: true,
      isActive: true,
      createdAt: true,
      partner: { select: { id: true, brandName: true, description: true } },
    },
  });

  if (!reward) {
    return NextResponse.json({ error: "Награда не найдена" }, { status: 404 });
  }

  const viewer = await getCurrentUser();
  const balance = viewer?.cachedBalance ?? null;

  // Заявки/покупки текущего пользователя по этой награде.
  let myRedemptions = null;
  if (viewer) {
    myRedemptions = await prisma.rewardRedemption.findMany({
      where: { userId: viewer.id, rewardId: id },
      orderBy: { purchasedAt: "desc" },
      select: {
        id: true,
        status: true,
        code: true,
        costTokens: true,
        purchasedAt: true,
        issuedAt: true,
      },
    });
  }

  const expired = reward.expiresAt != null && reward.expiresAt.getTime() < Date.now();
  const inStock = reward.stock == null || reward.stock > 0;

  return NextResponse.json({
    reward: {
      ...reward,
      inStock,
      expired,
      available: reward.isActive && !expired && inStock,
    },
    balance,
    affordable: balance == null ? null : balance >= reward.costTokens,
    myRedemptions,
  });
}
