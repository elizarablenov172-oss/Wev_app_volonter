import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { markDialogRead } from "@/server/social/chat";
import { SocialError, socialErrorStatus } from "@/server/social/friends";

/** POST /api/dialogs/[id]/read — пометить входящие сообщения прочитанными. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/dialogs/[id]/read">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    await markDialogRead(auth.id, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}
