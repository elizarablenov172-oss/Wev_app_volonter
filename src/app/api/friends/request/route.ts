import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { sendFriendRequest, SocialError, socialErrorStatus } from "@/server/social/friends";

/** POST /api/friends/request { userId } — отправить заявку в друзья. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!userId) {
    return NextResponse.json({ error: "Не указан пользователь" }, { status: 400 });
  }

  try {
    const friendship = await sendFriendRequest(auth.id, userId);
    return NextResponse.json({ friendship }, { status: 201 });
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}
