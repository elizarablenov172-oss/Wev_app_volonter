import { z } from "zod";

/**
 * Zod-схемы и типы соц-профиля (ТЗ 3.3, 3.9).
 * Используются в API-роутах и в правилах начисления.
 */

/** Допустимые платформы соц-ссылок (для подсказок UI; не ограничивает строго). */
export const SOCIAL_PLATFORMS = [
  "telegram",
  "vk",
  "instagram",
  "youtube",
  "tiktok",
  "website",
  "other",
] as const;

/** Одна соц-ссылка профиля. */
export const socialLinkSchema = z.object({
  platform: z.string().trim().min(1, "Укажите платформу").max(40),
  url: z.string().trim().url("Некорректная ссылка").max(500),
});

export type SocialLink = z.infer<typeof socialLinkSchema>;

/** Настройки приватности профиля. */
export const privacySchema = z.object({
  contacts: z.boolean(),
  socials: z.boolean(),
  feed: z.enum(["PUBLIC", "FRIENDS", "PRIVATE"]),
});

export type Privacy = z.infer<typeof privacySchema>;

/** Значения приватности по умолчанию (используются при отсутствии настроек). */
export const DEFAULT_PRIVACY: Privacy = {
  contacts: true,
  socials: true,
  feed: "PUBLIC",
};

/** Тело PATCH /api/profile — все поля опциональны (частичное обновление). */
export const profileUpdateSchema = z
  .object({
    displayName: z.string().trim().min(2, "Минимум 2 символа").max(80),
    nickname: z
      .string()
      .trim()
      .min(2, "Минимум 2 символа")
      .max(40)
      .nullable()
      .or(z.literal("")),
    city: z.string().trim().max(80).nullable().or(z.literal("")),
    bio: z.string().trim().max(1000).nullable().or(z.literal("")),
    contactPhone: z.string().trim().max(40).nullable().or(z.literal("")),
    interests: z.array(z.string().trim().min(1).max(40)).max(30),
    socialLinks: z.array(socialLinkSchema).max(20),
    privacy: privacySchema,
  })
  .partial();

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/** Тело POST /api/profile/social-links. */
export const socialLinksBodySchema = z.object({
  links: z.array(socialLinkSchema).max(20),
});

/**
 * Безопасно приводит JSON-поле `socialLinks` к массиву валидных ссылок.
 * Возвращает только записи с непустыми platform+url.
 */
export function parseSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  const result: SocialLink[] = [];
  for (const item of value) {
    const parsed = socialLinkSchema.safeParse(item);
    if (parsed.success) result.push(parsed.data);
  }
  return result;
}

/** Безопасно приводит JSON-поле `privacy` к объекту настроек (с дефолтами). */
export function parsePrivacy(value: unknown): Privacy {
  const parsed = privacySchema.safeParse(value);
  return parsed.success ? parsed.data : DEFAULT_PRIVACY;
}
