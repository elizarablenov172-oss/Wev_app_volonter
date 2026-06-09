import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { evaluateAndAwardProfile } from "@/server/tokens/profileRules";
import { socialLinksBodySchema } from "@/lib/validators/profile";

/** POST /api/profile/social-links — заменяет список соц-ссылок + начисление. */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Некорректный запрос" }, { status: 400 });
  }

  const parsed = socialLinksBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Проверьте ссылки",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 400 },
    );
  }

  await prisma.user.update({
    where: { id: auth.id },
    data: {
      socialLinks: parsed.data.links as unknown as Prisma.InputJsonValue,
    },
  });

  const { awarded, balance } = await evaluateAndAwardProfile(auth.id);

  return NextResponse.json({ awarded, balance, links: parsed.data.links });
}
