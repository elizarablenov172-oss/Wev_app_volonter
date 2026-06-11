import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { requireApiUser } from "@/server/api-auth";
import { searchUsers } from "@/server/social/friends";

/** GET /api/users/search?q= — поиск пользователей для добавления в друзья. */
export async function GET(request: NextRequest) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const items = await searchUsers(q, auth.id);
  return NextResponse.json({ items });
}
