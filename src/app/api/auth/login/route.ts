import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSession, verifyPassword } from "@/server/auth";
import { loginSchema } from "@/lib/validators/auth";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Введите e-mail и пароль" },
      { status: 422 },
    );
  }

  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  // Единое сообщение, чтобы не раскрывать наличие e-mail в системе.
  const invalid = NextResponse.json(
    { error: "Неверный e-mail или пароль" },
    { status: 401 },
  );

  if (!user) return invalid;

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return invalid;

  if (user.isBlocked) {
    return NextResponse.json(
      { error: "Аккаунт заблокирован. Обратитесь к администратору." },
      { status: 403 },
    );
  }

  await createSession(user.id, user.role);

  return NextResponse.json({ ok: true, role: user.role });
}
