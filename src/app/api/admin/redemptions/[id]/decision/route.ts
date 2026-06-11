import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { decideRedemption } from "@/server/rewards/redemption";
import { redemptionErrorResponse } from "@/server/rewards/redemption-http";
import { redemptionDecisionSchema } from "@/lib/validators/rewards";

/**
 * POST /api/admin/redemptions/[id]/decision — решение администратора по заявке
 * на крупную награду. approve → выдача (ISSUED + код); reject → возврат токенов.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/redemptions/[id]/decision">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json({ error: "Только для администратора" }, { status: 403 });
  }

  const { id: redemptionId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = redemptionDecisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте данные решения", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await decideRedemption({
      adminOrPartnerId: auth.id,
      redemptionId,
      action: parsed.data.action,
      reason: parsed.data.reason ?? null,
    });
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
