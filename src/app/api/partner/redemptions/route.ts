import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { getOwnedPartner } from "@/server/rewards/redemption";

/**
 * GET /api/partner/redemptions — выкупы по наградам текущего партнёра
 * (для отслеживания использования предложений).
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARTNER") {
    return NextResponse.json({ error: "Только для партнёра" }, { status: 403 });
  }

  const partner = await getOwnedPartner(auth.id);
  if (!partner) {
    return NextResponse.json({ error: "Профиль партнёра не найден" }, { status: 404 });
  }

  const items = await prisma.rewardRedemption.findMany({
    where: { reward: { partnerId: partner.id } },
    orderBy: { purchasedAt: "desc" },
    select: {
      id: true,
      status: true,
      code: true,
      costTokens: true,
      purchasedAt: true,
      issuedAt: true,
      reward: { select: { id: true, title: true, type: true } },
      user: { select: { id: true, displayName: true, nickname: true } },
    },
  });

  return NextResponse.json({ items });
}
