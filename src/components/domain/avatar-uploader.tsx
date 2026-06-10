"use client";

import * as React from "react";
import { Camera, CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";

export interface AvatarUploaderProps {
  /** Текущий URL аватара (для превью). */
  currentUrl: string | null;
  /** Имя для инициалов-плейсхолдера. */
  displayName: string;
  /** Вызывается после успешной загрузки: (newUrl, awarded). */
  onUploaded?: (avatarUrl: string, awarded: number) => void;
}

const MAX_BYTES = 5 * 1024 * 1024; // 5 МБ

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}

/**
 * Загрузчик аватара: превью + выбор файла → POST /api/profile/photo (FormData).
 * При awarded>0 показывает toast о начислении токенов.
 */
export function AvatarUploader({
  currentUrl,
  displayName,
  onUploaded,
}: AvatarUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [preview, setPreview] = React.useState<string | null>(currentUrl);
  const [uploading, setUploading] = React.useState(false);

  // Освобождаем object-URL предпросмотра при размонтировании.
  const objectUrlRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    // Сбрасываем value, чтобы повторный выбор того же файла сработал.
    e.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Выберите изображение");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Файл слишком большой (макс. 5 МБ)");
      return;
    }

    // Локальное превью сразу.
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const localUrl = URL.createObjectURL(file);
    objectUrlRef.current = localUrl;
    setPreview(localUrl);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/profile/photo", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? "Не удалось загрузить фото");
      }

      setPreview(data.avatarUrl);
      if (typeof data.awarded === "number" && data.awarded > 0) {
        toast.success(`+${data.awarded} токенов за фото профиля`);
      } else {
        toast.success("Фото обновлено");
      }
      onUploaded?.(data.avatarUrl, data.awarded ?? 0);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка загрузки");
      setPreview(currentUrl);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt="Аватар"
            className="size-20 rounded-full border border-border bg-surface-muted object-cover"
          />
        ) : (
          <span
            className="flex size-20 items-center justify-center rounded-full bg-primary text-2xl font-extrabold text-on-primary"
            aria-hidden
          >
            {initials(displayName)}
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-foreground/40">
            <CircleNotch className="size-6 animate-spin text-white" weight="bold" aria-hidden />
          </span>
        )}
      </div>

      <div className="space-y-1">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-semibold transition-colors hover:bg-surface-muted disabled:opacity-50"
        >
          <Camera className="size-4" weight="duotone" aria-hidden />
          {uploading ? "Загрузка…" : "Загрузить фото"}
        </button>
        <p className="text-xs text-muted">PNG, JPG или WebP, до 5 МБ</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}
