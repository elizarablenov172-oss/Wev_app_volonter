import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { removeFriendship, SocialError, socialErrorStatus } from "@/server/social/friends";

/** DELETE /api/friends/[id] — удалить из друзей / отменить заявку. */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/friends/[id]">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    await removeFriendship(auth.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}
