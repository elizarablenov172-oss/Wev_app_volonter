import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import {
  acceptMission,
  MissionError,
  missionErrorStatus,
} from "@/server/missions/missions";

/**
 * POST /api/missions/[id]/start — волонтёр берёт задание.
 *
 * Создаёт MissionSubmission(ACCEPTED). Доступно только роли VOLUNTEER.
 * Доменные ошибки сервиса маппятся в HTTP-коды (404/409).
 */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/missions/[id]/start">,
) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  if (auth.role !== "VOLUNTEER") {
    return NextResponse.json(
      { error: "Брать задания может только волонтёр" },
      { status: 403 },
    );
  }

  const { id: missionId } = await ctx.params;

  try {
    const { submission } = await acceptMission({ userId: auth.id, missionId });
    return NextResponse.json(
      {
        submission: {
          id: submission.id,
          missionId: submission.missionId,
          status: submission.status,
        },
      },
      { status: 201 },
    );
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
