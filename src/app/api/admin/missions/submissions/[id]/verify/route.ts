import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import {
  verifySubmission,
  MissionError,
  missionErrorStatus,
} from "@/server/missions/missions";
import { verifySubmissionSchema } from "@/lib/validators/missions";

/**
 * POST /api/admin/missions/submissions/[id]/verify — решение модератора.
 *
 * body: { action: 'approve' | 'reject', note? }.
 * approve → COMPLETED + начисление награды (идемпотентно); reject → REJECTED.
 * Только роль ADMIN. Решать можно только сабмишн в статусе PENDING_REVIEW.
 */
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/admin/missions/submissions/[id]/verify">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  if (auth.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Доступ только для администратора" },
      { status: 403 },
    );
  }

  const { id: submissionId } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = verifySubmissionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Проверьте решение",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }
  const { action, note } = parsed.data;

  try {
    const result = await verifySubmission({
      adminId: auth.id,
      submissionId,
      action,
      note: note ?? null,
    });
    return NextResponse.json({
      submission: {
        id: result.submission.id,
        status: result.submission.status,
        moderatorNote: result.submission.moderatorNote,
        reviewedAt: result.submission.reviewedAt,
      },
      awarded: result.awarded,
      balance: result.balance,
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
