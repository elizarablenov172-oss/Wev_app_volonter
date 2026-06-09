import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword } from "@/server/auth";
import { registerSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Проверьте поля формы",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { email, password, displayName, role, city, nickname, orgName, brandName } =
    parsed.data;

  // Проверка уникальности e-mail.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Пользователь с таким e-mail уже существует" },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        displayName,
        role,
        city: city?.trim() || null,
        nickname: nickname?.trim() || null,
        // Организация/партнёр создаются вложенно со статусом PENDING (модерация).
        ...(role === "ORGANIZATION"
          ? {
              organization: {
                create: { name: orgName!.trim(), status: "PENDING" },
              },
            }
          : {}),
        ...(role === "PARTNER"
          ? {
              partner: {
                create: { brandName: brandName!.trim(), status: "PENDING" },
              },
            }
          : {}),
      },
      select: { id: true, role: true },
    });

    await createSession(user.id, user.role);

    return NextResponse.json({ ok: true, role: user.role }, { status: 201 });
  } catch (error) {
    // Гонка по уникальному индексу (email/nickname).
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { error: "E-mail или никнейм уже заняты" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Не удалось создать аккаунт" },
      { status: 500 },
    );
  }
}
