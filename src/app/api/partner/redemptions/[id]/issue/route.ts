import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { getOwnedPartner, markIssued } from "@/server/rewards/redemption";
import { redemptionErrorResponse } from "@/server/rewards/redemption-http";

/**
 * POST /api/partner/redemptions/[id]/issue — партнёр отмечает выкуп по своей
 * награде как фактически выданный.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/partner/redemptions/[id]/issue">,
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

  // Проверяем, что выкуп относится к награде этого партнёра.
  const redemption = await prisma.rewardRedemption.findUnique({
    where: { id },
    select: { id: true, reward: { select: { partnerId: true } } },
  });
  if (!redemption || redemption.reward.partnerId !== partner.id) {
    return NextResponse.json({ error: "Заявка не найдена" }, { status: 404 });
  }

  try {
    const updated = await markIssued({ partnerUserId: auth.id, redemptionId: id });
    return NextResponse.json({ redemption: updated });
  } catch (error) {
    const mapped = redemptionErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
