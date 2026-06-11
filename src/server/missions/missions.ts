import {
  Prisma,
  type Mission,
  type MissionStatus,
  type MissionSubmission,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { earnTokens } from "@/server/tokens/ledger";

/**
 * Сервис модуля «Задания/Миссии» (Этап 6).
 *
 * Жизненный цикл сабмишна волонтёра:
 *   AVAILABLE (нет записи) → ACCEPTED (взял задание)
 *     → PENDING_REVIEW (сдал пруф) → COMPLETED | REJECTED (решение модератора).
 *
 * Гарантия «одно задание = одна награда»: начисление идёт через ledger с
 * идемпотентным ключом `mission:{submissionId}` (антифрод ТЗ 3.9), поэтому
 * повторный approve того же сабмишна НЕ дублирует токены.
 *
 * Все доменные ошибки — класс `MissionError` с кодами, чтобы route handler
 * мог отдать корректный HTTP-статус и русское сообщение.
 */

/** Ошибки доменного слоя миссий. */
export class MissionError extends Error {
  readonly code:
    | "NOT_FOUND" // миссия/сабмишн не найдены
    | "INACTIVE" // миссия выключена
    | "EXPIRED" // дедлайн прошёл
    | "WRONG_STATUS" // недопустимый текущий статус сабмишна
    | "FORBIDDEN"; // нет прав на действие

  constructor(code: MissionError["code"], message: string) {
    super(message);
    this.name = "MissionError";
    this.code = code;
  }
}

/** Маппинг доменного кода ошибки миссии в HTTP-статус (для route handlers). */
export function missionErrorStatus(error: MissionError): number {
  switch (error.code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
      return 403;
    case "INACTIVE":
    case "EXPIRED":
    case "WRONG_STATUS":
      return 409;
    default:
      return 400;
  }
}

/** Проверяет, что дедлайн миссии (если задан) ещё не прошёл. */
function isExpired(mission: Pick<Mission, "deadline">, now = new Date()): boolean {
  return mission.deadline != null && mission.deadline.getTime() < now.getTime();
}

/**
 * Строковый статус миссии для фронта.
 * Нет сабмишна → AVAILABLE; иначе статус самого сабмишна.
 */
export function computeMissionStatus(
  submission: Pick<MissionSubmission, "status"> | null,
): MissionStatus {
  return submission?.status ?? "AVAILABLE";
}

// ─────────────────────────── Взять задание ───────────────────────────

export interface AcceptMissionParams {
  userId: string;
  missionId: string;
}

export interface AcceptMissionResult {
  submission: MissionSubmission;
}

/**
 * Волонтёр берёт задание: создаёт `MissionSubmission{status: ACCEPTED}`.
 * Условия: миссия активна и дедлайн не прошёл. Повтор (есть запись) → WRONG_STATUS.
 */
export async function acceptMission(
  params: AcceptMissionParams,
): Promise<AcceptMissionResult> {
  const { userId, missionId } = params;

  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) {
    throw new MissionError("NOT_FOUND", "Задание не найдено");
  }
  if (!mission.isActive) {
    throw new MissionError("INACTIVE", "Задание сейчас недоступно");
  }
  if (isExpired(mission)) {
    throw new MissionError("EXPIRED", "Срок выполнения задания истёк");
  }

  try {
    const submission = await prisma.missionSubmission.create({
      data: { missionId, userId, status: "ACCEPTED" },
    });
    return { submission };
  } catch (error) {
    // @@unique([missionId, userId]) — задание уже взято этим пользователем.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new MissionError("WRONG_STATUS", "Вы уже взяли это задание");
    }
    throw error;
  }
}

// ─────────────────────────── Сдать пруф ───────────────────────────

export interface SubmitProofParams {
  userId: string;
  missionId: string;
  proofUrl?: string | null;
  proofData?: Prisma.InputJsonValue | null;
}

export interface SubmitProofResult {
  submission: MissionSubmission;
}

/**
 * Волонтёр сдаёт подтверждение выполнения.
 * Требуется существующий сабмишн в статусе ACCEPTED → переводим в
 * PENDING_REVIEW и сохраняем proofUrl/proofData. Можно пересдать пруф из
 * REJECTED (новая попытка). COMPLETED/PENDING_REVIEW → WRONG_STATUS.
 */
export async function submitProof(
  params: SubmitProofParams,
): Promise<SubmitProofResult> {
  const { userId, missionId, proofUrl = null, proofData = null } = params;

  const mission = await prisma.mission.findUnique({ where: { id: missionId } });
  if (!mission) {
    throw new MissionError("NOT_FOUND", "Задание не найдено");
  }
  if (!mission.isActive) {
    throw new MissionError("INACTIVE", "Задание сейчас недоступно");
  }
  if (isExpired(mission)) {
    throw new MissionError("EXPIRED", "Срок выполнения задания истёк");
  }

  const submission = await prisma.missionSubmission.findUnique({
    where: { missionId_userId: { missionId, userId } },
  });
  if (!submission) {
    throw new MissionError(
      "WRONG_STATUS",
      "Сначала возьмите задание, затем сдайте подтверждение",
    );
  }
  if (submission.status !== "ACCEPTED" && submission.status !== "REJECTED") {
    throw new MissionError(
      "WRONG_STATUS",
      submission.status === "COMPLETED"
        ? "Задание уже выполнено"
        : "Подтверждение уже отправлено на проверку",
    );
  }

  const updated = await prisma.missionSubmission.update({
    where: { id: submission.id },
    data: {
      status: "PENDING_REVIEW",
      proofUrl,
      proofData: proofData ?? Prisma.JsonNull,
      // Сброс прошлого решения при пересдаче.
      reviewedById: null,
      reviewedAt: null,
      moderatorNote: null,
    },
  });

  return { submission: updated };
}

// ─────────────────────────── Проверка модератором ───────────────────────────

export interface VerifySubmissionParams {
  adminId: string;
  submissionId: string;
  action: "approve" | "reject";
  note?: string | null;
}

export interface VerifySubmissionResult {
  submission: MissionSubmission;
  /** Сколько токенов фактически начислено (0 при reject или повторном approve). */
  awarded: number;
  /** Баланс волонтёра после операции. */
  balance: number;
}

/**
 * Модератор подтверждает или отклоняет сданный пруф.
 *
 * approve: PENDING_REVIEW → COMPLETED, начисление награды через ledger
 *   (идемпотентный ключ `mission:{submissionId}`), запись в ленту (MISSION_DONE)
 *   и уведомление (MISSION_STATUS).
 * reject: PENDING_REVIEW → REJECTED + moderatorNote + уведомление.
 *
 * В обоих случаях фиксируется AdminAuditLog. Решать можно только сабмишн в
 * статусе PENDING_REVIEW.
 */
export async function verifySubmission(
  params: VerifySubmissionParams,
): Promise<VerifySubmissionResult> {
  const { adminId, submissionId, action, note = null } = params;

  const submission = await prisma.missionSubmission.findUnique({
    where: { id: submissionId },
    include: { mission: { select: { id: true, title: true, rewardTokens: true } } },
  });
  if (!submission) {
    throw new MissionError("NOT_FOUND", "Сабмишн не найден");
  }
  if (submission.status !== "PENDING_REVIEW") {
    throw new MissionError(
      "WRONG_STATUS",
      "Проверять можно только подтверждения на модерации",
    );
  }

  const { mission } = submission;

  if (action === "reject") {
    const updated = await prisma.$transaction(async (tx) => {
      const sub = await tx.missionSubmission.update({
        where: { id: submission.id },
        data: {
          status: "REJECTED",
          reviewedById: adminId,
          reviewedAt: new Date(),
          moderatorNote: note,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminId,
          action: "REJECT_MISSION_SUBMISSION",
          targetType: "missionSubmission",
          targetId: submission.id,
          meta: { missionId: mission.id, note: note ?? null },
        },
      });
      await tx.notification.create({
        data: {
          userId: submission.userId,
          type: "MISSION_STATUS",
          title: "Задание отклонено",
          body: note
            ? `«${mission.title}» отклонено: ${note}`
            : `«${mission.title}» отклонено модератором. Можно сдать заново.`,
          refType: "mission",
          refId: mission.id,
        },
      });
      return sub;
    });

    const balance = await readBalance(submission.userId);
    return { submission: updated, awarded: 0, balance };
  }

  // approve
  const updated = await prisma.$transaction(async (tx) => {
    const sub = await tx.missionSubmission.update({
      where: { id: submission.id },
      data: {
        status: "COMPLETED",
        reviewedById: adminId,
        reviewedAt: new Date(),
        moderatorNote: note,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId,
        action: "APPROVE_MISSION_SUBMISSION",
        targetType: "missionSubmission",
        targetId: submission.id,
        meta: {
          missionId: mission.id,
          rewardTokens: mission.rewardTokens,
          note: note ?? null,
        },
      },
    });
    return sub;
  });

  // Начисление награды — идемпотентно по submissionId (защита от дубля approve).
  const earn = await earnTokens({
    userId: submission.userId,
    amount: mission.rewardTokens,
    type: "EARN_MISSION",
    reason: `Выполнение задания «${mission.title}»`,
    refType: "mission",
    refId: mission.id,
    idempotencyKey: `mission:${submission.id}`,
    createdBy: adminId,
  });

  // Лента + уведомление — только если реально начислили (первый approve).
  if (earn.awarded > 0) {
    await prisma.activityFeedItem.create({
      data: {
        userId: submission.userId,
        type: "MISSION_DONE",
        refType: "mission",
        refId: mission.id,
        text: `Выполнено задание «${mission.title}» +${earn.awarded} токенов`,
        visibility: "PUBLIC",
      },
    });
    await prisma.notification.create({
      data: {
        userId: submission.userId,
        type: "MISSION_STATUS",
        title: "Задание выполнено",
        body: `«${mission.title}»: +${earn.awarded} токенов`,
        refType: "mission",
        refId: mission.id,
      },
    });
  }

  return { submission: updated, awarded: earn.awarded, balance: earn.balance };
}

// ─────────────────────────── Вспомогательное ───────────────────────────

/** Читает актуальный (кэшированный) баланс пользователя. */
async function readBalance(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { cachedBalance: true },
  });
  return user?.cachedBalance ?? 0;
}
