import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { reserveReward } from "@/server/rewards/redemption";
import { redemptionErrorResponse } from "@/server/rewards/redemption-http";

/**
 * POST /api/rewards/[id]/reserve — резерв награды под одобрение
 * (для крупных наград с requiresApproval). Токены списываются сразу (hold),
 * заявка создаётся в статусе PENDING_APPROVAL.
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/rewards/[id]/reserve">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Заявки на награды доступны волонтёру" },
      { status: 403 },
    );
  }

  const { id: rewardId } = await ctx.params;

  try {
    const result = await reserveReward({ userId: auth.id, rewardId });
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
