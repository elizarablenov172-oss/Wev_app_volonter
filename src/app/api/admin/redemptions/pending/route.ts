import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * GET /api/admin/redemptions/pending — очередь заявок на крупные награды
 * (PENDING_APPROVAL) для модерации администратором.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const items = await prisma.rewardRedemption.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: { purchasedAt: "asc" },
    select: {
      id: true,
      costTokens: true,
      purchasedAt: true,
      reward: {
        select: {
          id: true,
          title: true,
          type: true,
          partner: { select: { id: true, brandName: true } },
        },
      },
      user: { select: { id: true, displayName: true, nickname: true, city: true } },
    },
  });

  return NextResponse.json({ items });
}
