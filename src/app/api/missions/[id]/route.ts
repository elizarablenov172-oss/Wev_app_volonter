import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { computeMissionStatus } from "@/server/missions/missions";

/**
 * GET /api/missions/[id] — детали задания + сабмишн текущего пользователя.
 *
 * Доступно всем (авторизация опциональна). Для авторизованного волонтёра
 * возвращается его сабмишн (mySubmission) и вычисленный статус (myStatus).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/missions/[id]">,
) {
  const { id } = await ctx.params;

  const mission = await prisma.mission.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      targetUrl: true,
      instruction: true,
      rewardTokens: true,
      deadline: true,
      audience: true,
      proofMethod: true,
      isActive: true,
      createdAt: true,
    },
  });
  if (!mission) {
    return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
  }

  const user = await getCurrentUser();

  let mySubmission = null;
  if (user) {
    mySubmission = await prisma.missionSubmission.findUnique({
      where: { missionId_userId: { missionId: id, userId: user.id } },
      select: {
        id: true,
        status: true,
        proofUrl: true,
        proofData: true,
        moderatorNote: true,
        reviewedAt: true,
        createdAt: true,
      },
    });
  }

  return NextResponse.json({
    mission,
    mySubmission,
    myStatus: user ? computeMissionStatus(mySubmission) : null,
  });
}
