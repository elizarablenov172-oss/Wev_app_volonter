import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/server/auth";
import { rewardListQuerySchema } from "@/lib/validators/rewards";

/**
 * GET /api/rewards — публичный каталог активных наград.
 *
 * Фильтры (query): type (тип награды), maxCost (потолок стоимости).
 * Сортировка sort: cost_asc | cost_desc | new (по умолчанию new).
 * Скрыты неактивные и награды с истёкшим сроком. Для авторизованного
 * добавляются affordable (хватает ли баланса) и inStock.
 */
export async function GET(request: NextRequest) {
  const parsed = rewardListQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные параметры фильтра", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { type, maxCost, sort } = parsed.data;

  const where: Prisma.RewardWhereInput = {
    isActive: true,
    OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
  };
  if (type) where.type = type;
  if (maxCost != null) where.costTokens = { lte: maxCost };

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
    getCurrentUser(),
  ]);

  const balance = viewer?.cachedBalance ?? null;

  const items = rewards.map((r) => ({
    ...r,
    inStock: r.stock == null || r.stock > 0,
    // affordable считаем только для авторизованного (иначе null).
    affordable: balance == null ? null : balance >= r.costTokens,
  }));

  return NextResponse.json({ items, balance });
}
