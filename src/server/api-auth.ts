import { NextResponse } from "next/server";
import { getCurrentUser, type SafeUser } from "@/server/auth";

/**
 * Хелпер авторизации для Route Handlers (API).
 *
 * В отличие от `requireUser()` (он делает redirect — поведение для страниц),
 * здесь при отсутствии сессии возвращаем JSON 401. Использование:
 *
 *   const auth = await requireApiUser();
 *   if (auth instanceof NextResponse) return auth;
 *   const user = auth; // SafeUser
 */
export async function requireApiUser(): Promise<SafeUser | NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json(
      { error: "Требуется авторизация" },
      { status: 401 },
    );
  }
  if (user.isBlocked) {
    return NextResponse.json({ error: "Аккаунт заблокирован" }, { status: 403 });
  }
  return user;
}
