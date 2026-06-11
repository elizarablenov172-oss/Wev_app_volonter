import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { missionUpdateSchema } from "@/lib/validators/missions";

/**
 * PATCH /api/admin/missions/[id] — частичное редактирование задания (ADMIN).
 * Передаются только изменяемые поля; пустой body допустим (no-op).
 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/admin/missions/[id]">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Доступ только для администратора" },
      { status: 403 },
    );
  }

  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = missionUpdateSchema.safeParse(body);
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

  // Собираем только переданные поля (partial-обновление).
  const updateData: Prisma.MissionUpdateInput = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.targetUrl !== undefined) updateData.targetUrl = data.targetUrl;
  if (data.instruction !== undefined) updateData.instruction = data.instruction;
  if (data.rewardTokens !== undefined) updateData.rewardTokens = data.rewardTokens;
  if (data.deadline !== undefined) {
    updateData.deadline = data.deadline ? new Date(data.deadline) : null;
  }
  if (data.audience !== undefined) updateData.audience = data.audience;
  if (data.proofMethod !== undefined) updateData.proofMethod = data.proofMethod;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  try {
    const mission = await prisma.$transaction(async (tx) => {
      const updated = await tx.mission.update({ where: { id }, data: updateData });
      await tx.adminAuditLog.create({
        data: {
          adminId: auth.id,
          action: "UPDATE_MISSION",
          targetType: "mission",
          targetId: id,
          meta: { fields: Object.keys(updateData) },
        },
      });
      return updated;
    });
    return NextResponse.json({ mission });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ error: "Задание не найдено" }, { status: 404 });
    }
    throw error;
  }
}
