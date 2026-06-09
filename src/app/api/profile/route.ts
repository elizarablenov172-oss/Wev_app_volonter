import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import {
  computeProfileCompletion,
  evaluateAndAwardProfile,
} from "@/server/tokens/profileRules";
import { profileUpdateSchema } from "@/lib/validators/profile";

/** GET /api/profile — текущий пользователь + % заполнения + баланс. */
export async function GET() {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  // auth уже без passwordHash (SafeUser), но перечитаем актуальную версию.
  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    omit: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
  }

  return NextResponse.json({
    user,
    completion: computeProfileCompletion(user),
    balance: user.cachedBalance,
  });
}

/** Нормализует «пустую строку → null» для опциональных строковых полей. */
function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** PATCH /api/profile — частичное обновление + начисление за профиль. */
export async function PATCH(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = profileUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Проверьте поля профиля",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  const input = parsed.data;
  const data: Prisma.UserUpdateInput = {};

  if (input.displayName !== undefined) data.displayName = input.displayName;
  if (input.nickname !== undefined) data.nickname = emptyToNull(input.nickname);
  if (input.city !== undefined) data.city = emptyToNull(input.city);
  if (input.bio !== undefined) data.bio = emptyToNull(input.bio);
  if (input.contactPhone !== undefined)
    data.contactPhone = emptyToNull(input.contactPhone);
  if (input.interests !== undefined) data.interests = input.interests;
  if (input.socialLinks !== undefined)
    data.socialLinks = input.socialLinks as unknown as Prisma.InputJsonValue;
  if (input.privacy !== undefined)
    data.privacy = input.privacy as unknown as Prisma.InputJsonValue;

  try {
    await prisma.user.update({ where: { id: auth.id }, data });
  } catch (error) {
    // Конфликт уникального nickname.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "Такой никнейм уже занят" },
        { status: 409 },
      );
    }
    throw error;
  }

  // Начисляем токены за заполнение профиля (идемпотентно).
  const { awarded, balance } = await evaluateAndAwardProfile(auth.id);

  const user = await prisma.user.findUnique({
    where: { id: auth.id },
    omit: { passwordHash: true },
  });

  return NextResponse.json({
    user,
    awarded,
    balance,
    completion: user ? computeProfileCompletion(user) : 0,
  });
}
