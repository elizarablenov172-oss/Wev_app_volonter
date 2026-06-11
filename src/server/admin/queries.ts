import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/** Серверные read-запросы админ-панели (Этап 7). */

/** Сводная статистика для дашборда. */
export async function getDashboardStats() {
  const [
    volunteers,
    organizations,
    partners,
    blocked,
    eventsPublished,
    eventsPending,
    missionsActive,
    submissionsPending,
    rewardsActive,
    redemptionsPending,
    orgsPending,
    partnersPending,
    earnAgg,
    spendAgg,
    circulationAgg,
  ] = await Promise.all([
    prisma.user.count({ where: { role: "VOLUNTEER" } }),
    prisma.organization.count(),
    prisma.partner.count(),
    prisma.user.count({ where: { isBlocked: true } }),
    prisma.event.count({ where: { status: "PUBLISHED" } }),
    prisma.event.count({ where: { status: "PENDING" } }),
    prisma.mission.count({ where: { isActive: true } }),
    prisma.missionSubmission.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.reward.count({ where: { isActive: true } }),
    prisma.rewardRedemption.count({ where: { status: "PENDING_APPROVAL" } }),
    prisma.organization.count({ where: { status: "PENDING" } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
    prisma.tokenTransaction.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } }),
    prisma.tokenTransaction.aggregate({ _sum: { amount: true }, where: { amount: { lt: 0 } } }),
    prisma.user.aggregate({ _sum: { cachedBalance: true } }),
  ]);

  return {
    volunteers,
    organizations,
    partners,
    blocked,
    eventsPublished,
    eventsPending,
    missionsActive,
    submissionsPending,
    rewardsActive,
    redemptionsPending,
    moderationPending: eventsPending + submissionsPending + redemptionsPending + orgsPending + partnersPending,
    orgsPending,
    partnersPending,
    tokensEarned: earnAgg._sum.amount ?? 0,
    tokensSpent: Math.abs(spendAgg._sum.amount ?? 0),
    tokensInCirculation: circulationAgg._sum.cachedBalance ?? 0,
  };
}

/** Список пользователей (с поиском по имени/email/нику). */
export async function listUsers(query: string) {
  const q = query.trim();
  const where: Prisma.UserWhereInput = q
    ? {
        OR: [
          { displayName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
          { nickname: { contains: q, mode: "insensitive" } },
        ],
      }
    : {};

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      displayName: true,
      email: true,
      nickname: true,
      role: true,
      isBlocked: true,
      cachedBalance: true,
      createdAt: true,
    },
  });
  return users.map((u) => ({ ...u, createdAt: u.createdAt.toISOString() }));
}

/** Заявки на верификацию организаций и партнёров (PENDING + история). */
export async function listAccountsForModeration() {
  const [organizations, partners] = await Promise.all([
    prisma.organization.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, email: true, displayName: true } },
      },
    }),
    prisma.partner.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        brandName: true,
        description: true,
        status: true,
        createdAt: true,
        user: { select: { id: true, email: true, displayName: true } },
      },
    }),
  ]);
  return {
    organizations: organizations.map((o) => ({ ...o, createdAt: o.createdAt.toISOString() })),
    partners: partners.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })),
  };
}

/** Правила начисления за заполнение профиля (ТЗ 3.9). */
export async function getProfileRules() {
  return prisma.profileCompletionRule.findMany({ orderBy: { tokens: "desc" } });
}

/** Журнал операций с токенами (ТЗ 3.14) с фильтрами. */
export async function getTokensLog(params: { type?: string; userId?: string }) {
  const where: Prisma.TokenTransactionWhereInput = {};
  if (params.type) where.type = params.type as Prisma.EnumTxTypeFilter["equals"];
  if (params.userId) where.userId = params.userId;

  const rows = await prisma.tokenTransaction.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      amount: true,
      type: true,
      reason: true,
      refType: true,
      createdAt: true,
      user: { select: { id: true, displayName: true, nickname: true } },
    },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}
