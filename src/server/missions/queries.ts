import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeMissionStatus } from "@/server/missions/missions";
import type { MissionListItem, MissionStatus } from "@/lib/missions";

/** Серверные read-запросы модуля заданий (зеркало GET-эндпоинтов). */

/** Активные задания + персональный статус волонтёра. */
export async function getMissionsForUser(userId: string): Promise<MissionListItem[]> {
  const now = new Date();
  const missions = await prisma.mission.findMany({
    where: { isActive: true, OR: [{ deadline: null }, { deadline: { gte: now } }] },
    orderBy: { createdAt: "desc" },
  });

  const subs = await prisma.missionSubmission.findMany({
    where: { userId, missionId: { in: missions.map((m) => m.id) } },
    select: { missionId: true, status: true },
  });
  const byMission = new Map(subs.map((s) => [s.missionId, s.status]));

  return missions.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    targetUrl: m.targetUrl,
    instruction: m.instruction,
    rewardTokens: m.rewardTokens,
    deadline: m.deadline ? m.deadline.toISOString() : null,
    audience: m.audience,
    proofMethod: m.proofMethod,
    createdAt: m.createdAt.toISOString(),
    myStatus: computeMissionStatus(
      byMission.has(m.id) ? { status: byMission.get(m.id) as never } : null,
    ) as MissionStatus,
  }));
}

/** Деталь задания + сабмишн пользователя. */
export async function getMissionDetail(id: string, userId: string) {
  const mission = await prisma.mission.findUnique({ where: { id } });
  if (!mission) return null;

  const submission = await prisma.missionSubmission.findUnique({
    where: { missionId_userId: { missionId: id, userId } },
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

  return {
    mission: {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      targetUrl: mission.targetUrl,
      instruction: mission.instruction,
      rewardTokens: mission.rewardTokens,
      deadline: mission.deadline ? mission.deadline.toISOString() : null,
      audience: mission.audience,
      proofMethod: mission.proofMethod,
      isActive: mission.isActive,
      createdAt: mission.createdAt.toISOString(),
    },
    submission: submission
      ? {
          id: submission.id,
          status: submission.status,
          proofUrl: submission.proofUrl,
          proofData: submission.proofData,
          moderatorNote: submission.moderatorNote,
          reviewedAt: submission.reviewedAt ? submission.reviewedAt.toISOString() : null,
          createdAt: submission.createdAt.toISOString(),
        }
      : null,
    myStatus: computeMissionStatus(submission),
  };
}

/** Все задания для админа + счётчики сабмишнов по статусам. */
export async function getAdminMissions() {
  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { submissions: true } },
      submissions: { select: { status: true } },
    },
  });

  return missions.map((m) => {
    const pending = m.submissions.filter((s) => s.status === "PENDING_REVIEW").length;
    const completed = m.submissions.filter((s) => s.status === "COMPLETED").length;
    return {
      id: m.id,
      title: m.title,
      rewardTokens: m.rewardTokens,
      proofMethod: m.proofMethod,
      deadline: m.deadline ? m.deadline.toISOString() : null,
      isActive: m.isActive,
      total: m._count.submissions,
      pending,
      completed,
    };
  });
}

/** Одно задание для редактирования (админ). */
export async function getMissionForEdit(id: string) {
  const m = await prisma.mission.findUnique({ where: { id } });
  if (!m) return null;
  return {
    id: m.id,
    title: m.title,
    description: m.description,
    targetUrl: m.targetUrl,
    instruction: m.instruction,
    rewardTokens: m.rewardTokens,
    deadline: m.deadline ? m.deadline.toISOString() : null,
    audience: m.audience,
    proofMethod: m.proofMethod,
    isActive: m.isActive,
  };
}

/** Очередь сабмишнов на проверке (PENDING_REVIEW). */
export async function getPendingSubmissions() {
  const rows = await prisma.missionSubmission.findMany({
    where: { status: "PENDING_REVIEW" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      proofUrl: true,
      proofData: true,
      createdAt: true,
      mission: { select: { id: true, title: true, rewardTokens: true, proofMethod: true, instruction: true, targetUrl: true } },
      user: { select: { id: true, displayName: true, nickname: true, city: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    proofUrl: r.proofUrl,
    proofData: r.proofData as Prisma.JsonValue,
    createdAt: r.createdAt.toISOString(),
    mission: r.mission,
    user: r.user,
  }));
}
