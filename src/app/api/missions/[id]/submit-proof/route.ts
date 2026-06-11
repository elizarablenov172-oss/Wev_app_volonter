import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { requireApiUser } from "@/server/api-auth";
import {
  submitProof,
  MissionError,
  missionErrorStatus,
} from "@/server/missions/missions";
import { saveImageFile, UploadError } from "@/server/uploads";
import { submitProofSchema } from "@/lib/validators/missions";

/**
 * POST /api/missions/[id]/submit-proof — волонтёр сдаёт подтверждение.
 *
 * Два формата тела:
 *   - multipart/form-data со скриншотом (поле `file`) — сохраняется в
 *     public/uploads/proofs, его URL пишется в proofUrl. Доп. данные можно
 *     передать строкой в поле `proofData` (JSON) или `note`.
 *   - application/json: { proofUrl?, proofData? } — для ссылки/кода/OAuth.
 *
 * У пользователя должен быть сабмишн в статусе ACCEPTED (или REJECTED —
 * пересдача); сервис переводит его в PENDING_REVIEW.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/missions/[id]/submit-proof">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Сдавать задания может только волонтёр" },
      { status: 403 },
    );
  }

  const { id: missionId } = await ctx.params;
  const contentType = request.headers.get("content-type") ?? "";

  let proofUrl: string | null = null;
  let proofData: Prisma.InputJsonValue | null = null;

  if (contentType.includes("multipart/form-data")) {
    // ── Вариант со скриншотом ──
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json(
        { error: "Ожидается multipart/form-data" },
        { status: 400 },
      );
    }

    const file = formData.get("file");
    if (file instanceof File) {
      try {
        const saved = await saveImageFile(file, "proofs");
        proofUrl = saved.publicUrl;
      } catch (error) {
        if (error instanceof UploadError) {
          return NextResponse.json(
            { error: error.message },
            { status: error.status },
          );
        }
        throw error;
      }
    }

    // Доп. данные пруфа (необязательно): JSON-строка или произвольная заметка.
    const rawData = formData.get("proofData");
    if (typeof rawData === "string" && rawData.trim()) {
      try {
        proofData = JSON.parse(rawData) as Prisma.InputJsonValue;
      } catch {
        return NextResponse.json(
          { error: "Поле proofData должно быть валидным JSON" },
          { status: 400 },
        );
      }
    }
    const note = formData.get("note");
    if (proofData == null && typeof note === "string" && note.trim()) {
      proofData = { note: note.trim() };
    }

    if (!proofUrl && proofData == null) {
      return NextResponse.json(
        { error: "Прикрепите скриншот (поле 'file') или данные пруфа" },
        { status: 400 },
      );
    }
  } else {
    // ── Вариант JSON (ссылка/код) ──
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
    }

    const parsed = submitProofSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: "Проверьте данные подтверждения",
          fields: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }
    proofUrl = parsed.data.proofUrl ?? null;
    proofData = (parsed.data.proofData as Prisma.InputJsonValue) ?? null;
  }

  try {
    const { submission } = await submitProof({
      userId: auth.id,
      missionId,
      proofUrl,
      proofData,
    });
    return NextResponse.json({
      submission: {
        id: submission.id,
        missionId: submission.missionId,
        status: submission.status,
        proofUrl: submission.proofUrl,
        proofData: submission.proofData,
      },
    });
  } catch (error) {
    if (error instanceof MissionError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: missionErrorStatus(error) },
      );
    }
    throw error;
  }
}
