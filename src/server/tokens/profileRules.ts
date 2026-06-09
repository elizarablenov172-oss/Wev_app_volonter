import { createHash } from "node:crypto";
import type { User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseSocialLinks } from "@/lib/validators/profile";
import { earnTokens } from "@/server/tokens/ledger";

/**
 * Правила начисления Social Tokens за заполнение профиля (ТЗ 3.9).
 *
 * Источник правил — таблица `ProfileCompletionRule` (настраивается админом).
 * Каждое фактическое начисление защищено идемпотентным ключом — повторное
 * «удалил-добавил» не приносит токенов (антифрод 3.9). При начислении
 * создаётся `Notification(TOKEN_EARN)`, при достижении 80% — `ActivityFeedItem`.
 */

/** Ключи правил (совпадают с `ProfileCompletionRule.actionKey`). */
export const PROFILE_ACTION_KEYS = {
  ADD_CONTACTS: "ADD_CONTACTS",
  ADD_PHOTO: "ADD_PHOTO",
  ADD_SOCIAL_LINK: "ADD_SOCIAL_LINK",
  FILL_FIELDS: "FILL_FIELDS",
  PROFILE_80: "PROFILE_80",
} as const;

/** Поля, учитываемые в проценте заполнения профиля. */
const COMPLETION_FIELDS = [
  "avatarUrl",
  "city",
  "bio",
  "contactPhone",
  "interests",
  "socialLinks",
  "nickname",
] as const;

/** Минимальный набор полей профиля для расчёта заполнения (без passwordHash). */
export type ProfileShape = Pick<
  User,
  | "avatarUrl"
  | "city"
  | "bio"
  | "contactPhone"
  | "interests"
  | "socialLinks"
  | "nickname"
>;

/** Порог «полностью заполнен» (бонус PROFILE_80). */
const PROFILE_COMPLETE_THRESHOLD = 80;

export interface EvaluateResult {
  awarded: number;
  balance: number;
}

/** Короткий хэш URL для идемпотентного ключа соц-ссылки. */
function linkHash(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 16);
}

/** Проверяет, что строковое поле непусто (после trim). */
function filled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Считает процент заполнения профиля по полям COMPLETION_FIELDS (0..100).
 * Экспортируется для фронта (индикатор прогресса).
 */
export function computeProfileCompletion(user: ProfileShape): number {
  const socialLinks = parseSocialLinks(user.socialLinks);
  let done = 0;

  for (const field of COMPLETION_FIELDS) {
    switch (field) {
      case "interests":
        if (Array.isArray(user.interests) && user.interests.length > 0) done++;
        break;
      case "socialLinks":
        if (socialLinks.length > 0) done++;
        break;
      default:
        if (filled(user[field])) done++;
    }
  }

  return Math.round((done / COMPLETION_FIELDS.length) * 100);
}

/**
 * Проверяет правила профиля и начисляет токены за выполненные действия.
 * Идемпотентно: повторный вызов на том же профиле ничего не добавит.
 */
export async function evaluateAndAwardProfile(
  userId: string,
): Promise<EvaluateResult> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error("Пользователь не найден");
  }

  const rules = await prisma.profileCompletionRule.findMany({
    where: { isActive: true },
  });
  const ruleByKey = new Map(rules.map((r) => [r.actionKey, r]));

  const socialLinks = parseSocialLinks(user.socialLinks);
  const completion = computeProfileCompletion(user);

  let totalAwarded = 0;
  let lastBalance = user.cachedBalance;

  /** Единичное начисление + уведомление. */
  const award = async (
    ruleId: string,
    amount: number,
    title: string,
    idempotencyKey: string,
  ): Promise<boolean> => {
    const res = await earnTokens({
      userId,
      amount,
      type: "EARN_PROFILE",
      reason: title,
      ruleId,
      refType: "profile",
      idempotencyKey,
    });
    lastBalance = res.balance;
    if (res.awarded > 0) {
      totalAwarded += res.awarded;
      await prisma.notification.create({
        data: {
          userId,
          type: "TOKEN_EARN",
          title: "Начислены токены",
          body: `${title}: +${res.awarded} токенов`,
          refType: "profile",
        },
      });
      return true;
    }
    return false;
  };

  // ADD_CONTACTS — заполнен телефон (разово).
  const contactsRule = ruleByKey.get(PROFILE_ACTION_KEYS.ADD_CONTACTS);
  if (contactsRule && filled(user.contactPhone)) {
    await award(
      contactsRule.id,
      contactsRule.tokens,
      contactsRule.title,
      `profile:ADD_CONTACTS:${userId}`,
    );
  }

  // ADD_PHOTO — загружен аватар (разово).
  const photoRule = ruleByKey.get(PROFILE_ACTION_KEYS.ADD_PHOTO);
  if (photoRule && filled(user.avatarUrl)) {
    await award(
      photoRule.id,
      photoRule.tokens,
      photoRule.title,
      `profile:ADD_PHOTO:${userId}`,
    );
  }

  // ADD_SOCIAL_LINK — за каждую валидную ссылку, но не больше limitCount суммарно.
  const socialRule = ruleByKey.get(PROFILE_ACTION_KEYS.ADD_SOCIAL_LINK);
  if (socialRule && socialLinks.length > 0) {
    const limit = socialRule.limitCount ?? socialLinks.length;
    // Сколько уже начислено по этому правилу пользователю.
    let alreadyAwarded = await prisma.tokenTransaction.count({
      where: { userId, ruleId: socialRule.id },
    });

    for (const link of socialLinks) {
      if (alreadyAwarded >= limit) break;
      const created = await award(
        socialRule.id,
        socialRule.tokens,
        socialRule.title,
        `profile:ADD_SOCIAL_LINK:${userId}:${linkHash(link.url)}`,
      );
      if (created) alreadyAwarded++;
    }
  }

  // FILL_FIELDS — заполнены город И интересы (разово).
  const fieldsRule = ruleByKey.get(PROFILE_ACTION_KEYS.FILL_FIELDS);
  if (
    fieldsRule &&
    filled(user.city) &&
    Array.isArray(user.interests) &&
    user.interests.length > 0
  ) {
    await award(
      fieldsRule.id,
      fieldsRule.tokens,
      fieldsRule.title,
      `profile:FILL_FIELDS:${userId}`,
    );
  }

  // PROFILE_80 — профиль заполнен ≥ 80% (разово, бонус + запись в ленту).
  const profile80Rule = ruleByKey.get(PROFILE_ACTION_KEYS.PROFILE_80);
  if (profile80Rule && completion >= PROFILE_COMPLETE_THRESHOLD) {
    const awarded = await award(
      profile80Rule.id,
      profile80Rule.tokens,
      profile80Rule.title,
      `profile:PROFILE_80:${userId}`,
    );
    if (awarded) {
      await prisma.activityFeedItem.create({
        data: {
          userId,
          type: "PROFILE_COMPLETE",
          refType: "profile",
          text: `Профиль заполнен на ${completion}% — бонус +${profile80Rule.tokens} токенов`,
          visibility: "PUBLIC",
        },
      });
    }
  }

  return { awarded: totalAwarded, balance: lastBalance };
}
