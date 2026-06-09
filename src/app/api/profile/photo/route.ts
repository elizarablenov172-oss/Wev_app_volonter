import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiUser } from "@/server/api-auth";
import { evaluateAndAwardProfile } from "@/server/tokens/profileRules";
import { saveImageFile, UploadError } from "@/server/uploads";

/** POST /api/profile/photo — загрузка аватара (multipart/form-data). */
export async function POST(request: Request) {
  const auth = await requireApiUser();
  if (auth instanceof NextResponse) return auth;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Ожидается multipart/form-data" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Файл не передан (поле 'file')" },
      { status: 400 },
    );
  }

  let avatarUrl: string;
  try {
    const saved = await saveImageFile(file, "avatars");
    avatarUrl = saved.publicUrl;
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }

  await prisma.user.update({
    where: { id: auth.id },
    data: { avatarUrl },
  });

  const { awarded, balance } = await evaluateAndAwardProfile(auth.id);

  return NextResponse.json({ avatarUrl, awarded, balance });
}
