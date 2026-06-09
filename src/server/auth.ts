import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Лёгкая собственная сессия на JWT (без NextAuth — несовместим с Next 16).
 * Секрет HS256 берётся из AUTH_SECRET. Cookie httpOnly `session`, срок 7 дней.
 */

const SESSION_COOKIE = "session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 дней
const BCRYPT_ROUNDS = 10;

/** Полезная нагрузка JWT-сессии. */
export interface SessionPayload {
  userId: string;
  role: Role;
}

/** Пользователь без чувствительных полей (passwordHash вырезан). */
export type SafeUser = Omit<User, "passwordHash">;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET не задан в окружении");
  }
  return new TextEncoder().encode(secret);
}

// ─────────────────────────── Пароли ───────────────────────────

/** Хеширует пароль (bcrypt). */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

/** Сверяет пароль с хешем. */
export async function verifyPassword(
  password: string,
  passwordHash: string,
): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}

// ─────────────────────────── Сессия ───────────────────────────

/** Подписывает JWT и кладёт его в httpOnly-cookie `session`. */
export async function createSession(
  userId: string,
  role: Role,
): Promise<void> {
  const token = await new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

/** Читает и верифицирует cookie сессии. Возвращает payload или null. */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.sub;
    const role = payload.role as Role | undefined;
    if (!userId || !role) return null;
    return { userId, role };
  } catch {
    // Невалидный/просроченный токен — считаем неавторизованным.
    return null;
  }
}

/** По активной сессии достаёт пользователя из БД (без passwordHash). */
export async function getCurrentUser(): Promise<SafeUser | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    omit: { passwordHash: true },
  });
  return user;
}

/** Удаляет cookie сессии (logout). */
export async function destroySession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// ─────────────────────── Серверные guard-хелперы ───────────────────────

/**
 * Требует авторизованного пользователя. Иначе → redirect('/login').
 * Возвращает пользователя (без passwordHash) для использования на странице.
 */
export async function requireUser(): Promise<SafeUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  if (user.isBlocked) {
    // Заблокированный аккаунт — завершаем сессию и выкидываем на логин.
    await destroySession();
    redirect("/login?blocked=1");
  }
  return user;
}

/**
 * Требует, чтобы пользователь имел одну из ролей.
 * Неавторизованный → redirect('/login'); неподходящая роль → notFound().
 */
export async function requireRole(roles: Role[]): Promise<SafeUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) {
    notFound();
  }
  return user;
}
