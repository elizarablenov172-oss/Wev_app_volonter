import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { prisma } from "@/lib/prisma";

/** GET /api/notifications — последние уведомления + число непрочитанных. */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const [items, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: auth.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        refType: true,
        refId: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({ where: { userId: auth.id, readAt: null } }),
  ]);

  return NextResponse.json({ items, unreadCount });
}
