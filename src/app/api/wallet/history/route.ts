import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

const HISTORY_LIMIT = 50;

/** GET /api/wallet/history — последние операции с токенами (убыв. дате). */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  const transactions = await prisma.tokenTransaction.findMany({
    where: { userId: auth.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
    select: {
      id: true,
      amount: true,
      type: true,
      reason: true,
      refType: true,
      refId: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ transactions, balance: auth.cachedBalance });
}
