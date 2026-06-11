import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  PartnerRewardItem,
  PendingRedemptionItem,
  PurchaseItem,
  RewardDetailResponse,
  RewardListItem,
  RewardType,
} from "@/lib/rewards";

/**
 * Серверные read-запросы Этапа 5 для рендера страниц (как `server/events/queries`
 * читают данные напрямую через Prisma). Формы результата ПОВТОРЯЮТ контракты
 * GET-эндпоинтов /api/rewards*, /api/partner/*, /api/admin/redemptions/pending.
 * Мутации (redeem/reserve/cancel/issue/decision/create/edit) идут через API.
 */

export interface RewardCatalogFilters {
  type?: RewardType;
  maxCost?: number;
  sort?: "cost_asc" | "cost_desc" | "new";
}

export interface RewardCatalogResult {
  items: RewardListItem[];
  balance: number | null;
}

/** Публичный каталог активных наград (зеркало GET /api/rewards). */
export async function getRewardCatalog(
  filters: RewardCatalogFilters,
  viewerId: string | null,
): Promise<RewardCatalogResult> {
  const sort = filters.sort ?? "new";

  const where: Prisma.RewardWhereInput = {
    isActive: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
  if (filters.type) where.type = filters.type;
  if (filters.maxCost != null) where.costTokens = { lte: filters.maxCost };

  const orderBy: Prisma.RewardOrderByWithRelationInput =
    sort === "cost_asc"
      ? { costTokens: "asc" }
      : sort === "cost_desc"
        ? { costTokens: "desc" }
        : { createdAt: "desc" };

  const [rewards, viewer] = await Promise.all([
    prisma.reward.findMany({
      where,
      orderBy,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        costTokens: true,
        stock: true,
        expiresAt: true,
        conditions: true,
        imageUrl: true,
        requiresApproval: true,
        createdAt: true,
        partner: { select: { id: true, brandName: true } },
      },
    }),
    viewerId
      ? prisma.user.findUnique({
          where: { id: viewerId },
          select: { cachedBalance: true },
        })
      : Promise.resolve(null),
  ]);

  const balance = viewer?.cachedBalance ?? null;

  const items: RewardListItem[] = rewards.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    costTokens: r.costTokens,
    stock: r.stock,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    conditions: r.conditions,
    imageUrl: r.imageUrl,
    requiresApproval: r.requiresApproval,
    createdAt: r.createdAt.toISOString(),
    partner: r.partner,
    inStock: r.stock == null || r.stock > 0,
    affordable: balance == null ? null : balance >= r.costTokens,
  }));

  return { items, balance };
}

/** Деталь награды + баланс/покупки пользователя (зеркало GET /api/rewards/[id]). */
export async function getRewardDetail(
  id: string,
  viewerId: string | null,
): Promise<RewardDetailResponse | null> {
  const reward = await prisma.reward.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      costTokens: true,
      stock: true,
      expiresAt: true,
      conditions: true,
      imageUrl: true,
      requiresApproval: true,
      isActive: true,
      createdAt: true,
      partner: { select: { id: true, brandName: true, description: true } },
    },
  });
  if (!reward) return null;

  const viewer = viewerId
    ? await prisma.user.findUnique({
        where: { id: viewerId },
        select: { cachedBalance: true },
      })
    : null;
  const balance = viewer?.cachedBalance ?? null;

  let myRedemptions: RewardDetailResponse["myRedemptions"] = null;
  if (viewerId) {
    const rows = await prisma.rewardRedemption.findMany({
      where: { userId: viewerId, rewardId: id },
      orderBy: { purchasedAt: "desc" },
      select: {
        id: true,
        status: true,
        code: true,
        costTokens: true,
        purchasedAt: true,
        issuedAt: true,
      },
    });
    myRedemptions = rows.map((r) => ({
      id: r.id,
      status: r.status,
      code: r.code,
      costTokens: r.costTokens,
      purchasedAt: r.purchasedAt.toISOString(),
      issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
    }));
  }

  const expired =
    reward.expiresAt != null && reward.expiresAt.getTime() < Date.now();
  const inStock = reward.stock == null || reward.stock > 0;

  return {
    reward: {
      id: reward.id,
      title: reward.title,
      description: reward.description,
      type: reward.type,
      costTokens: reward.costTokens,
      stock: reward.stock,
      expiresAt: reward.expiresAt ? reward.expiresAt.toISOString() : null,
      conditions: reward.conditions,
      imageUrl: reward.imageUrl,
      requiresApproval: reward.requiresApproval,
      isActive: reward.isActive,
      createdAt: reward.createdAt.toISOString(),
      partner: reward.partner,
      inStock,
      expired,
      available: reward.isActive && !expired && inStock,
    },
    balance,
    affordable: balance == null ? null : balance >= reward.costTokens,
    myRedemptions,
  };
}

/** История покупок/заявок пользователя (зеркало GET /api/rewards/redemptions). */
export async function getUserPurchases(userId: string): Promise<PurchaseItem[]> {
  const rows = await prisma.rewardRedemption.findMany({
    where: { userId },
    orderBy: { purchasedAt: "desc" },
    select: {
      id: true,
      status: true,
      code: true,
      costTokens: true,
      purchasedAt: true,
      issuedAt: true,
      reward: {
        select: {
          id: true,
          title: true,
          type: true,
          imageUrl: true,
          partner: { select: { id: true, brandName: true } },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    code: r.code,
    costTokens: r.costTokens,
    purchasedAt: r.purchasedAt.toISOString(),
    issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
    reward: r.reward,
  }));
}

/** Награды текущего партнёра + счётчик выкупов (зеркало GET /api/partner/rewards). */
export async function getPartnerRewards(
  userId: string,
): Promise<PartnerRewardItem[]> {
  const partner = await prisma.partner.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!partner) return [];

  const rows = await prisma.reward.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  return rows.map(({ _count, ...r }) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    type: r.type,
    costTokens: r.costTokens,
    stock: r.stock,
    expiresAt: r.expiresAt ? r.expiresAt.toISOString() : null,
    conditions: r.conditions,
    imageUrl: r.imageUrl,
    requiresApproval: r.requiresApproval,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    redemptionsCount: _count.redemptions,
  }));
}

/** Одна награда партнёра для редактирования (только владелец). */
export async function getPartnerRewardForEdit(id: string, userId: string) {
  const partner = await prisma.partner.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!partner) return null;

  const reward = await prisma.reward.findUnique({ where: { id } });
  if (!reward || reward.partnerId !== partner.id) return null;

  return {
    id: reward.id,
    title: reward.title,
    description: reward.description,
    type: reward.type,
    costTokens: reward.costTokens,
    stock: reward.stock,
    expiresAt: reward.expiresAt ? reward.expiresAt.toISOString() : null,
    conditions: reward.conditions,
    imageUrl: reward.imageUrl,
    requiresApproval: reward.requiresApproval,
    isActive: reward.isActive,
  };
}

/** Выкупы по наградам партнёра (зеркало GET /api/partner/redemptions). */
export async function getPartnerRedemptions(userId: string) {
  const partner = await prisma.partner.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!partner) return [];

  const rows = await prisma.rewardRedemption.findMany({
    where: { reward: { partnerId: partner.id } },
    orderBy: { purchasedAt: "desc" },
    select: {
      id: true,
      status: true,
      code: true,
      costTokens: true,
      purchasedAt: true,
      issuedAt: true,
      reward: { select: { id: true, title: true, type: true } },
      user: { select: { id: true, displayName: true, nickname: true } },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    status: r.status,
    code: r.code,
    costTokens: r.costTokens,
    purchasedAt: r.purchasedAt.toISOString(),
    issuedAt: r.issuedAt ? r.issuedAt.toISOString() : null,
    reward: r.reward,
    user: r.user,
  }));
}

/** Очередь заявок PENDING_APPROVAL (зеркало GET /api/admin/redemptions/pending). */
export async function getPendingRedemptions(): Promise<PendingRedemptionItem[]> {
  const rows = await prisma.rewardRedemption.findMany({
    where: { status: "PENDING_APPROVAL" },
    orderBy: { purchasedAt: "asc" },
    select: {
      id: true,
      costTokens: true,
      purchasedAt: true,
      reward: {
        select: {
          id: true,
          title: true,
          type: true,
          partner: { select: { id: true, brandName: true } },
        },
      },
      user: {
        select: { id: true, displayName: true, nickname: true, city: true },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    costTokens: r.costTokens,
    purchasedAt: r.purchasedAt.toISOString(),
    reward: r.reward,
    user: r.user,
  }));
}
