import { NextResponse } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { listFriends } from "@/server/social/friends";

/** GET /api/friends — друзья + входящие/исходящие заявки. */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listFriends(auth.id));
}
