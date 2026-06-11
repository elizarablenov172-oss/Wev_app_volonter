import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { listDialogs, getOrCreateDialog } from "@/server/social/chat";
import { SocialError, socialErrorStatus } from "@/server/social/friends";

/** GET /api/dialogs — список диалогов с превью и счётчиком непрочитанных. */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ items: await listDialogs(auth.id) });
}

/** POST /api/dialogs { userId } — получить/создать диалог с другом. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const userId = typeof body?.userId === "string" ? body.userId : null;
  if (!userId) {
    return NextResponse.json({ error: "Не указан собеседник" }, { status: 400 });
  }

  try {
    const dialog = await getOrCreateDialog(auth.id, userId);
    return NextResponse.json({ dialogId: dialog.id });
  } catch (e) {
    if (e instanceof SocialError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: socialErrorStatus(e) });
    throw e;
  }
}
