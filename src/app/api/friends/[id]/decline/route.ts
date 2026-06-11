import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { declineRequest, SocialError, socialErrorStatus } from "@/server/social/friends";

/** POST /api/friends/[id]/decline — отклонить входящую заявку. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/friends/[id]/decline">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    const friendship = await declineRequest(auth.id, id);
    return NextResponse.json({ friendship });
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}
