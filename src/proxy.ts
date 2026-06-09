import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { Role } from "@prisma/client";

/**
 * Proxy (бывший middleware — переименован в Next.js 16).
 * Оптимистичная защита маршрутов: проверяем наличие и валидность session-cookie
 * и роль. JWT верифицируется через `jose` (без Prisma/bcrypt — они тут недоступны).
 * Финальная проверка прав — всегда на сервере (requireUser / requireRole).
 */

const SESSION_COOKIE = "session";

// Префиксы, требующие конкретной роли.
const ROLE_PREFIXES: { prefix: string; roles: Role[] }[] = [
  { prefix: "/org", roles: ["ORGANIZATION"] },
  { prefix: "/partner", roles: ["PARTNER"] },
  { prefix: "/admin", roles: ["ADMIN"] },
];

// Префиксы, требующие любой авторизации.
const AUTH_PREFIXES = [
  "/feed",
  "/profile",
  "/wallet",
  "/events",
  "/missions",
  "/marketplace",
  "/friends",
  "/chats",
  "/notifications",
];

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET не задан в окружении");
  return new TextEncoder().encode(secret);
}

async function readSession(
  token: string | undefined,
): Promise<{ userId: string; role: Role } | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.sub;
    const role = payload.role as Role | undefined;
    if (!userId || !role) return null;
    return { userId, role };
  } catch {
    return null;
  }
}

function redirectToLogin(request: NextRequest): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  // Сохраняем целевой путь, чтобы вернуть после входа.
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname)}`;
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = await readSession(token);

  // Защита ролевых разделов.
  const roleRule = ROLE_PREFIXES.find(
    (r) => pathname === r.prefix || pathname.startsWith(`${r.prefix}/`),
  );
  if (roleRule) {
    if (!session) return redirectToLogin(request);
    if (!roleRule.roles.includes(session.role)) {
      // Неподходящая роль — на свою «домашнюю» страницу.
      const url = request.nextUrl.clone();
      url.pathname = "/feed";
      url.search = "";
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Защита общих разделов (любая авторизация).
  const needsAuth = AUTH_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (needsAuth && !session) {
    return redirectToLogin(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/feed/:path*",
    "/profile/:path*",
    "/wallet/:path*",
    "/events/:path*",
    "/missions/:path*",
    "/marketplace/:path*",
    "/friends/:path*",
    "/chats/:path*",
    "/notifications/:path*",
    "/org/:path*",
    "/partner/:path*",
    "/admin/:path*",
  ],
};
