import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { getOwnedPartner } from "@/server/rewards/redemption";
import {
  rewardCreateSchema,
  APPROVAL_REQUIRED_BY_DEFAULT,
} from "@/lib/validators/rewards";

/** GET /api/partner/rewards — награды текущего партнёра (+ счётчик выкупов). */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARTNER") {
    return NextResponse.json({ error: "Только для партнёра" }, { status: 403 });
  }

  const partner = await getOwnedPartner(auth.id);
  if (!partner) {
    return NextResponse.json({ error: "Профиль партнёра не найден" }, { status: 404 });
  }

  const items = await prisma.reward.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { redemptions: true } } },
  });

  return NextResponse.json({
    items: items.map(({ _count, ...r }) => ({ ...r, redemptionsCount: _count.redemptions })),
  });
}

/** POST /api/partner/rewards — создать награду (партнёр должен быть APPROVED). */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "PARTNER") {
    return NextResponse.json({ error: "Только для партнёра" }, { status: 403 });
  }

  const partner = await getOwnedPartner(auth.id);
  if (!partner) {
    return NextResponse.json({ error: "Профиль партнёра не найден" }, { status: 404 });
  }
  if (partner.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Аккаунт партнёра ещё не подтверждён администратором" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = rewardCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Проверьте поля награды", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }
  const data = parsed.data;

  // requiresApproval: явный флаг, иначе — по типу награды.
  const requiresApproval =
    data.requiresApproval ?? APPROVAL_REQUIRED_BY_DEFAULT.includes(data.type);

  const reward = await prisma.reward.create({
    data: {
      partnerId: partner.id,
      title: data.title,
      description: data.description,
      type: data.type,
      costTokens: data.costTokens,
      stock: data.stock ?? null,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      conditions: data.conditions ?? null,
      imageUrl: data.imageUrl ?? null,
      requiresApproval,
      isActive: true,
    },
  });

  return NextResponse.json({ reward }, { status: 201 });
}
