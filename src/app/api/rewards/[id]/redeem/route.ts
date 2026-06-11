import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { redeemReward } from "@/server/rewards/redemption";
import { redemptionErrorResponse } from "@/server/rewards/redemption-http";

/**
 * POST /api/rewards/[id]/redeem — мгновенная покупка награды за токены
 * (для наград без одобрения). Списание через ledger, выдаётся код.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/rewards/[id]/redeem">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Покупка наград доступна волонтёру" },
      { status: 403 },
    );
  }

  const { id: rewardId } = await ctx.params;

  try {
    const result = await redeemReward({ userId: auth.id, rewardId });
    return NextResponse.json(
      { redemption: result.redemption, balance: result.balance },
      { status: 201 },
    );
  } catch (error) {
    const mapped = redemptionErrorResponse(error);
    if (mapped) return mapped;
    throw error;
  }
}
