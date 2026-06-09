"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { InterestsInput } from "./interests-input";
import { AvatarUploader } from "./avatar-uploader";

/** Соц-ссылка в форме. */
interface SocialLink {
  platform: string;
  url: string;
}

interface PrivacySettings {
  contacts: boolean;
  socials: boolean;
  feed: "PUBLIC" | "FRIENDS" | "PRIVATE";
}

export interface ProfileEditInitial {
  displayName: string;
  nickname: string;
  city: string;
  bio: string;
  contactPhone: string;
  avatarUrl: string | null;
  interests: string[];
  socialLinks: SocialLink[];
  privacy: PrivacySettings;
}

export interface ProfileEditFormProps {
  initial: ProfileEditInitial;
}

const PLATFORM_OPTIONS = [
  { value: "telegram", label: "Telegram" },
  { value: "vk", label: "ВКонтакте" },
  { value: "instagram", label: "Instagram" },
  { value: "youtube", label: "YouTube" },
  { value: "tiktok", label: "TikTok" },
  { value: "website", label: "Сайт" },
  { value: "other", label: "Другое" },
];

/** Показывает toast о начислении токенов, если они есть. */
function toastAwarded(awarded: unknown, label: string) {
  if (typeof awarded === "number" && awarded > 0) {
    toast.success(`+${awarded} токенов за ${label}`);
  }
}

/**
 * Форма редактирования соц-профиля. Сохраняет основные поля через
 * PATCH /api/profile, соц-ссылки — через POST /api/profile/social-links,
 * аватар — через AvatarUploader (POST /api/profile/photo). По начислениям
 * (awarded) показывает toast.
 */
export function ProfileEditForm({ initial }: ProfileEditFormProps) {
  const router = useRouter();

  const [displayName, setDisplayName] = React.useState(initial.displayName);
  const [nickname, setNickname] = React.useState(initial.nickname);
  const [city, setCity] = React.useState(initial.city);
  const [bio, setBio] = React.useState(initial.bio);
  const [contactPhone, setContactPhone] = React.useState(initial.contactPhone);
  const [interests, setInterests] = React.useState<string[]>(
    initial.interests,
  );
  const [socialLinks, setSocialLinks] = React.useState<SocialLink[]>(
    initial.socialLinks.length > 0 ? initial.socialLinks : [],
  );
  const [privacy, setPrivacy] = React.useState<PrivacySettings>(
    initial.privacy,
  );
  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(
    initial.avatarUrl,
  );

  const [saving, setSaving] = React.useState(false);
  const [fieldErrors, setFieldErrors] = React.useState<
    Record<string, string[]>
  >({});

  function addSocialLink() {
    setSocialLinks((prev) => [...prev, { platform: "telegram", url: "" }]);
  }
  function updateSocialLink(index: number, patch: Partial<SocialLink>) {
    setSocialLinks((prev) =>
      prev.map((l, i) => (i === index ? { ...l, ...patch } : l)),
    );
  }
  function removeSocialLink(index: number) {
    setSocialLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});

    // Только непустые соц-ссылки уходят на сервер.
    const cleanLinks = socialLinks
      .map((l) => ({ platform: l.platform.trim(), url: l.url.trim() }))
      .filter((l) => l.platform && l.url);

    try {
      // 1) Основные поля + приватность + интересы.
      const patchRes = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({
          displayName,
          nickname,
          city,
          bio,
          contactPhone,
          interests,
          privacy,
        }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) {
        if (patchData?.fields) setFieldErrors(patchData.fields);
        throw new Error(patchData?.error ?? "Не удалось сохранить профиль");
      }

      // 2) Соц-ссылки — отдельным эндпоинтом (своё начисление).
      const linksRes = await fetch("/api/profile/social-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ links: cleanLinks }),
      });
      const linksData = await linksRes.json().catch(() => ({}));
      if (!linksRes.ok) {
        throw new Error(linksData?.error ?? "Не удалось сохранить соц-ссылки");
      }

      // Начисления: суммируем уведомления (профиль + соц-ссылки).
      const total =
        (typeof patchData.awarded === "number" ? patchData.awarded : 0) +
        (typeof linksData.awarded === "number" ? linksData.awarded : 0);
      if (total > 0) {
        toast.success(`+${total} токенов за заполнение профиля`);
      } else {
        toast.success("Профиль сохранён");
      }

      router.push("/profile");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  const err = (key: string) => fieldErrors[key]?.[0];

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Аватар */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-bold text-muted">Фото профиля</h2>
          <AvatarUploader
            currentUrl={avatarUrl}
            displayName={displayName || "?"}
            onUploaded={(url, awarded) => {
              setAvatarUrl(url);
              toastAwarded(awarded, "фото профиля");
            }}
          />
        </CardContent>
      </Card>

      {/* Основные поля */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-sm font-bold text-muted">Основное</h2>

          <div>
            <Label htmlFor="displayName">Имя</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              aria-invalid={Boolean(err("displayName"))}
              required
            />
            {err("displayName") && (
              <p className="mt-1 text-xs text-danger-strong">
                {err("displayName")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="nickname">Никнейм</Label>
            <Input
              id="nickname"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="например, eco_hero"
              aria-invalid={Boolean(err("nickname"))}
            />
            {err("nickname") && (
              <p className="mt-1 text-xs text-danger-strong">
                {err("nickname")}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Москва"
            />
          </div>

          <div>
            <Label htmlFor="bio">О себе</Label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              maxLength={1000}
              placeholder="Расскажите о себе и своих волонтёрских интересах"
              className="flex w-full rounded-md border border-border bg-surface px-3.5 py-2.5 text-base text-foreground shadow-sm transition-colors placeholder:text-muted focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div>
            <Label htmlFor="contactPhone">Телефон</Label>
            <Input
              id="contactPhone"
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="+7 900 000-00-00"
            />
          </div>
        </CardContent>
      </Card>

      {/* Интересы */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <div>
            <h2 className="text-sm font-bold text-muted">Интересы</h2>
            <p className="text-xs text-muted">
              Город и интересы вместе дают бонус токенов.
            </p>
          </div>
          <InterestsInput value={interests} onChange={setInterests} />
        </CardContent>
      </Card>

      {/* Соц-ссылки */}
      <Card>
        <CardContent className="space-y-3 py-5">
          <h2 className="text-sm font-bold text-muted">Соцсети</h2>
          {socialLinks.length > 0 && (
            <ul className="space-y-2">
              {socialLinks.map((link, i) => (
                <li key={i} className="flex gap-2">
                  <select
                    value={link.platform}
                    onChange={(e) =>
                      updateSocialLink(i, { platform: e.target.value })
                    }
                    aria-label="Платформа"
                    className="h-11 shrink-0 rounded-md border border-border bg-surface px-3 text-sm font-semibold text-foreground shadow-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    {PLATFORM_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <Input
                    value={link.url}
                    onChange={(e) =>
                      updateSocialLink(i, { url: e.target.value })
                    }
                    placeholder="https://…"
                    inputMode="url"
                    aria-label="Ссылка"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(i)}
                    className="flex size-11 shrink-0 items-center justify-center rounded-md border border-border text-muted transition-colors hover:bg-danger-soft hover:text-danger-strong"
                    aria-label="Удалить ссылку"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={addSocialLink}
            className="inline-flex h-10 items-center gap-1.5 rounded-md border border-dashed border-border px-4 text-sm font-semibold text-primary transition-colors hover:bg-primary-soft"
          >
            <Plus className="size-4" aria-hidden />
            Добавить ссылку
          </button>
        </CardContent>
      </Card>

      {/* Приватность */}
      <Card>
        <CardContent className="space-y-4 py-5">
          <h2 className="text-sm font-bold text-muted">Приватность</h2>

          <PrivacyToggle
            id="privacy-contacts"
            label="Показывать контакты"
            description="Телефон виден другим пользователям"
            checked={privacy.contacts}
            onChange={(v) => setPrivacy((p) => ({ ...p, contacts: v }))}
          />
          <PrivacyToggle
            id="privacy-socials"
            label="Показывать соцсети"
            description="Ссылки на соцсети видны в публичном профиле"
            checked={privacy.socials}
            onChange={(v) => setPrivacy((p) => ({ ...p, socials: v }))}
          />
          <PrivacyToggle
            id="privacy-feed"
            label="Публичная лента"
            description="Другие видят вашу активность"
            checked={privacy.feed === "PUBLIC"}
            onChange={(v) =>
              setPrivacy((p) => ({ ...p, feed: v ? "PUBLIC" : "PRIVATE" }))
            }
          />
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={saving}>
          {saving && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {saving ? "Сохранение…" : "Сохранить"}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={saving}
          onClick={() => router.push("/profile")}
        >
          Отмена
        </Button>
      </div>
    </form>
  );
}

function PrivacyToggle({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <label htmlFor={id} className="block text-sm font-semibold">
          {label}
        </label>
        <p className="text-xs text-muted">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
