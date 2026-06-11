import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * GET /api/rewards/redemptions — история покупок и заявок текущего пользователя
 * (награда, статус, код выдачи, даты).
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const items = await prisma.rewardRedemption.findMany({
    where: { userId: auth.id },
    orderBy: { purchasedAt: "desc" },
    select: {
      id: true,
      status: true,
      code: true,
      costTokens: true,
      purchasedAt: true,
      issuedAt: true,
      reward: {
        select: {
          id: true,
          title: true,
          type: true,
          imageUrl: true,
          partner: { select: { id: true, brandName: true } },
        },
      },
    },
  });

  return NextResponse.json({ items });
}
