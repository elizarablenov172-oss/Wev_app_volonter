import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { cancelRedemption } from "@/server/rewards/redemption";
import { redemptionErrorResponse } from "@/server/rewards/redemption-http";

/**
 * POST /api/rewards/redemptions/[id]/cancel — пользователь отменяет свою заявку
 * (CREATED/PENDING_APPROVAL/APPROVED) с возвратом токенов и стока.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/rewards/redemptions/[id]/cancel">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const { id: redemptionId } = await ctx.params;

  try {
    const result = await cancelRedemption({ userId: auth.id, redemptionId });
    return NextResponse.json({
      redemption: result.redemption,
      balance: result.balance,
    });
  } catch (error) {
    const mapped = redemptionErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
