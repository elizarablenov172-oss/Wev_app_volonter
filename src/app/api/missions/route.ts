import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { computeMissionStatus } from "@/server/missions/missions";
import { missionListQuerySchema } from "@/lib/validators/missions";

/**
 * GET /api/missions — список активных заданий.
 *
 * Показываются только `isActive` миссии с непросроченным дедлайном
 * (deadline ≥ сейчас либо без дедлайна). Для авторизованного волонтёра к
 * каждому заданию добавляется его персональный статус (myStatus) — AVAILABLE,
 * если он ещё не брал задание. Пагинация: page / pageSize.
 */
export async function GET(request: NextRequest) {
  const parsed = missionListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Некорректные параметры списка",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const { page, pageSize } = parsed.data;
  const now = new Date();

  // Активные + не просроченные (либо вовсе без дедлайна).
  const where: Prisma.MissionWhereInput = {
    isActive: true,
    OR: [{ deadline: null }, { deadline: { gte: now } }],
  };

  const user = await getCurrentUser();

  const [total, missions] = await Promise.all([
    prisma.mission.count({ where }),
    prisma.mission.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
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
    }),
  ]);

  // Персональные статусы — одним запросом по взятым заданиям пользователя.
  let statusByMission = new Map<string, string>();
  if (user) {
    const subs = await prisma.missionSubmission.findMany({
      where: { userId: user.id, missionId: { in: missions.map((m) => m.id) } },
      select: { missionId: true, status: true },
    });
    statusByMission = new Map(subs.map((s) => [s.missionId, s.status]));
  }

  const items = missions.map((m) => ({
    ...m,
    myStatus: user
      ? computeMissionStatus(
          statusByMission.has(m.id)
            ? { status: statusByMission.get(m.id) as never }
            : null,
        )
      : null,
  }));

  return NextResponse.json({
    items,
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
  });
}
