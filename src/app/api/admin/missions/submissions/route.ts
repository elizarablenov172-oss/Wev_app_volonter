import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";

/**
 * GET /api/admin/missions/submissions — очередь сабмишнов на проверке
 * (status = PENDING_REVIEW), с данными задания и волонтёра. Только ADMIN.
 */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Доступ только для администратора" },
      { status: 403 },
    );
  }

  const items = await prisma.missionSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      proofUrl: true,
      proofData: true,
      createdAt: true,
      mission: {
        select: { id: true, title: true, rewardTokens: true, proofMethod: true },
      },
      user: {
        select: { id: true, displayName: true, nickname: true, avatarUrl: true },
      },
    },
  });

  return NextResponse.json({ items });
}
