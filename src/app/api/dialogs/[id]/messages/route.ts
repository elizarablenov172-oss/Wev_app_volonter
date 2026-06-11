import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { getDialogMessages, sendMessage } from "@/server/social/chat";
import { SocialError, socialErrorStatus } from "@/server/social/friends";

/** GET /api/dialogs/[id]/messages — сообщения диалога (помечает входящие прочитанными). */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/dialogs/[id]/messages">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  try {
    return NextResponse.json(await getDialogMessages(auth.id, id));
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}

/** POST /api/dialogs/[id]/messages { text } — отправить сообщение. */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/dialogs/[id]/messages">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const { id } = await ctx.params;

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Пустое сообщение" }, { status: 400 });
  }

  try {
    const message = await sendMessage(auth.id, id, text);
    return NextResponse.json({ message }, { status: 201 });
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}
