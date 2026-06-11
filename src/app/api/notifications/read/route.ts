import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { prisma } from "@/lib/prisma";

/** POST /api/notifications/read { id? } — пометить одно или все уведомления прочитанными. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const body = await request.json().catch(() => ({}));
  const id = typeof body?.id === "string" ? body.id : null;

  if (id) {
    await prisma.notification.updateMany({
      where: { id, userId: auth.id, readAt: null },
      data: { readAt: new Date() },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId: auth.id, readAt: null },
      data: { readAt: new Date() },
    });
  }

  return NextResponse.json({ ok: true });
}
