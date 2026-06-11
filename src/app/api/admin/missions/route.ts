import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { missionCreateSchema } from "@/lib/validators/missions";

/**
 * GET /api/admin/missions — все задания (для админ-панели), с счётчиками сабмишнов.
 * POST /api/admin/missions — создать задание.
 * Только роль ADMIN.
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

  const missions = await prisma.mission.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: { submissions: { where: { status: "PENDING_REVIEW" } } },
      },
    },
  });

  const items = missions.map(({ _count, ...m }) => ({
    ...m,
    pendingCount: _count.submissions,
  }));

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Доступ только для администратора" },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = missionCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Проверьте поля задания",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const data = parsed.data;

  const mission = await prisma.$transaction(async (tx) => {
    const created = await tx.mission.create({
      data: {
        title: data.title,
        description: data.description,
        targetUrl: data.targetUrl ?? null,
        instruction: data.instruction ?? null,
        rewardTokens: data.rewardTokens,
        deadline: data.deadline ? new Date(data.deadline) : null,
        audience: data.audience ?? null,
        proofMethod: data.proofMethod ?? "SCREENSHOT",
        isActive: true,
      },
    });
    await tx.adminAuditLog.create({
      data: {
        adminId: auth.id,
        action: "CREATE_MISSION",
        targetType: "mission",
        targetId: created.id,
        meta: { rewardTokens: created.rewardTokens },
      },
    });
    return created;
  });

  return NextResponse.json({ mission }, { status: 201 });
}
