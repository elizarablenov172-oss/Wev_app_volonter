import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createId } from "@/lib/id";

/**
 * Сохранение пользовательских файлов в `public/uploads/...`.
 * Файлы попадают в .gitignore — не коммитятся.
 */

/** Допустимые image MIME → расширение. */
const IMAGE_MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 МБ

/** Ошибка валидации загрузки (сообщение — для пользователя). */
export class UploadError extends Error {
  readonly status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "UploadError";
    this.status = status;
  }
}

export interface SavedImage {
  /** Публичный URL для записи в БД (`/uploads/...`). */
  publicUrl: string;
  /** Абсолютный путь на диске. */
  absolutePath: string;
}

/**
 * Валидирует image-файл и сохраняет в `public/uploads/{subdir}/{cuid}.{ext}`.
 */
export async function saveImageFile(
  file: File,
  subdir: string,
): Promise<SavedImage> {
  const ext = IMAGE_MIME_EXT[file.type];
  if (!ext) {
    throw new UploadError(
      "Допустимы только изображения (JPEG, PNG, WEBP, GIF)",
    );
  }
  if (file.size === 0) {
    throw new UploadError("Файл пустой");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError("Файл слишком большой (максимум 5 МБ)");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${createId()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, fileName);
  await writeFile(absolutePath, buffer);

  return {
    publicUrl: `/uploads/${subdir}/${fileName}`,
    absolutePath,
  };
}
