/**
 * Идемпотентный seed демо-данных (через upsert) для платформы «Евразия».
 *
 * ⚠️ Не импортируем `src/server/auth.ts` — он тянет `next/headers`, который вне
 * рантайма Next недоступен. Пароли хешируем напрямую через bcryptjs.
 *
 * Запуск: `npx prisma db seed` (см. package.json → prisma.seed).
 */
import {
  PrismaClient,
  Prisma,
  type Role,
  type TxType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Password123!";
const BCRYPT_ROUNDS = 10;

/** Дата в будущем (n дней от сегодня). */
function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(10, 0, 0, 0);
  return d;
}

interface SeedTx {
  amount: number;
  type: TxType;
  reason: string;
  refType?: string;
}

/**
 * Создаёт пользователя через upsert + выставляет журнал транзакций и
 * согласованный `cachedBalance` (баланс = SUM(amount), ТЗ 3.3).
 */
async function upsertUser(opts: {
  email: string;
  role: Role;
  displayName: string;
  passwordHash: string;
  nickname?: string;
  city?: string;
  bio?: string;
  contactPhone?: string;
  avatarUrl?: string;
  interests?: string[];
  socialLinks?: { platform: string; url: string }[];
  transactions?: SeedTx[];
  levelName?: string;
}): Promise<{ id: string; balance: number }> {
  const {
    email,
    role,
    displayName,
    passwordHash,
    nickname,
    city,
    bio,
    contactPhone,
    avatarUrl,
    interests = [],
    socialLinks = [],
    transactions = [],
    levelName,
  } = opts;

  const balance = transactions.reduce((acc, t) => acc + t.amount, 0);

  const level = levelName
    ? await prisma.level.findFirst({ where: { name: levelName } })
    : null;

  // Каноничные поля профиля — их можно безопасно обновлять при каждом seed.
  const updateData = {
    role,
    displayName,
    passwordHash,
    nickname: nickname ?? null,
    city: city ?? null,
    bio: bio ?? null,
    contactPhone: contactPhone ?? null,
    avatarUrl: avatarUrl ?? null,
    interests,
    socialLinks: socialLinks as unknown as Prisma.InputJsonValue,
    privacy: {
      contacts: true,
      socials: true,
      feed: "PUBLIC",
    } as unknown as Prisma.InputJsonValue,
  };

  // ВАЖНО: cachedBalance/levelId выставляем ТОЛЬКО при создании. seed запускается
  // при каждом старте контейнера; если переносить их в `update`, повторный seed
  // сбросил бы баланс к сумме сид-транзакций и стёр всё, что пользователь заработал
  // после сидинга (журнал — источник истины, кэш ведёт ledger-сервис).
  const user = await prisma.user.upsert({
    where: { email },
    update: updateData,
    create: {
      email,
      ...updateData,
      cachedBalance: balance,
      levelId: level?.id ?? null,
    },
  });

  // Журнал транзакций — пересоздаём с детерминированными idempotencyKey,
  // чтобы повторный seed не дублировал.
  for (let i = 0; i < transactions.length; i++) {
    const t = transactions[i];
    const key = `seed:${user.id}:${i}`;
    await prisma.tokenTransaction.upsert({
      where: { idempotencyKey: key },
      update: {},
      create: {
        userId: user.id,
        amount: t.amount,
        type: t.type,
        reason: t.reason,
        refType: t.refType ?? "seed",
        idempotencyKey: key,
      },
    });
  }

  return { id: user.id, balance };
}

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_ROUNDS);

  // 1. Уровни
  const levels = [
    { name: "Новичок", minTokens: 0, order: 1 },
    { name: "Активист", minTokens: 100, order: 2 },
    { name: "Лидер", minTokens: 500, order: 3 },
    { name: "Амбассадор", minTokens: 1500, order: 4 },
  ];
  for (const l of levels) {
    const existing = await prisma.level.findFirst({ where: { name: l.name } });
    if (existing) {
      await prisma.level.update({ where: { id: existing.id }, data: l });
    } else {
      await prisma.level.create({ data: l });
    }
  }

  // 2. Правила начисления за профиль (ТЗ 3.9)
  const rules = [
    {
      actionKey: "ADD_CONTACTS",
      title: "Добавлены контактные данные",
      tokens: 10,
      perAction: true,
      limitCount: 1,
    },
    {
      actionKey: "ADD_PHOTO",
      title: "Загружено фото профиля",
      tokens: 10,
      perAction: true,
      limitCount: 1,
    },
    {
      actionKey: "ADD_SOCIAL_LINK",
      title: "Добавлена ссылка на соцсеть",
      tokens: 5,
      perAction: true,
      limitCount: 5,
    },
    {
      actionKey: "FILL_FIELDS",
      title: "Заполнены город и интересы",
      tokens: 10,
      perAction: true,
      limitCount: 1,
    },
    {
      actionKey: "PROFILE_80",
      title: "Профиль заполнен на 80%+",
      tokens: 20,
      perAction: true,
      limitCount: 1,
    },
  ];
  for (const r of rules) {
    await prisma.profileCompletionRule.upsert({
      where: { actionKey: r.actionKey },
      update: { title: r.title, tokens: r.tokens, perAction: r.perAction, limitCount: r.limitCount, isActive: true },
      create: { ...r, isActive: true },
    });
  }

  // 3. Бейджи
  const badges = [
    { code: "FIRST_EVENT", name: "Первое мероприятие", description: "Принял участие в первом мероприятии" },
    { code: "PROFILE_100", name: "Профиль 100%", description: "Полностью заполнил профиль" },
    { code: "ACTIVIST_WEEK", name: "Активист недели", description: "Самый активный волонтёр недели" },
    { code: "MISSION_MASTER", name: "Мастер заданий", description: "Выполнил 5 заданий" },
  ];
  for (const b of badges) {
    await prisma.badge.upsert({
      where: { code: b.code },
      update: { name: b.name, description: b.description },
      create: b,
    });
  }

  // 4. Чистим старых тестовых юзеров (test_* / smoke_*) — каскад удалит их данные.
  const deleted = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { startsWith: "test_" } },
        { email: { startsWith: "smoke_" } },
      ],
    },
  });

  // 5. Админ
  await upsertUser({
    email: "admin@evraziya.local",
    role: "ADMIN",
    displayName: "Администратор Евразии",
    passwordHash,
    nickname: "admin",
    city: "Москва",
  });

  // 6. Волонтёры (заполненные профили, разные балансы)
  const volunteers = await Promise.all([
    upsertUser({
      email: "anna@evraziya.local",
      role: "VOLUNTEER",
      displayName: "Анна Петрова",
      passwordHash,
      nickname: "anna_p",
      city: "Москва",
      bio: "Люблю помогать людям и животным.",
      contactPhone: "+7 900 111-22-33",
      interests: ["экология", "животные", "дети"],
      socialLinks: [{ platform: "telegram", url: "https://t.me/anna_p" }],
      levelName: "Активист",
      transactions: [
        { amount: 50, type: "EARN_PROFILE", reason: "Заполнение профиля" },
        { amount: 100, type: "EARN_EVENT", reason: "Участие в субботнике" },
      ],
    }),
    upsertUser({
      email: "ivan@evraziya.local",
      role: "VOLUNTEER",
      displayName: "Иван Смирнов",
      passwordHash,
      nickname: "ivan_s",
      city: "Санкт-Петербург",
      bio: "Студент, волонтёр-эколог.",
      contactPhone: "+7 900 222-33-44",
      interests: ["спорт", "экология"],
      levelName: "Новичок",
      transactions: [
        { amount: 30, type: "EARN_PROFILE", reason: "Заполнение профиля" },
      ],
    }),
    upsertUser({
      email: "maria@evraziya.local",
      role: "VOLUNTEER",
      displayName: "Мария Кузнецова",
      passwordHash,
      nickname: "maria_k",
      city: "Казань",
      bio: "Организую помощь пожилым.",
      contactPhone: "+7 900 333-44-55",
      interests: ["пожилые", "медицина", "образование"],
      socialLinks: [
        { platform: "vk", url: "https://vk.com/maria_k" },
        { platform: "instagram", url: "https://instagram.com/maria_k" },
      ],
      levelName: "Лидер",
      transactions: [
        { amount: 60, type: "EARN_PROFILE", reason: "Заполнение профиля" },
        { amount: 300, type: "EARN_EVENT", reason: "Серия мероприятий" },
        { amount: 200, type: "EARN_MISSION", reason: "Выполнение заданий" },
        { amount: -50, type: "SPEND_REWARD", reason: "Покупка мерча" },
      ],
    }),
  ]);

  // 7. Организация + мероприятия
  const orgUser = await upsertUser({
    email: "org@evraziya.local",
    role: "ORGANIZATION",
    displayName: "Фонд «Зелёный город»",
    passwordHash,
    city: "Москва",
  });
  const organization = await prisma.organization.upsert({
    where: { userId: orgUser.id },
    update: { name: "Фонд «Зелёный город»", status: "APPROVED" },
    create: {
      userId: orgUser.id,
      name: "Фонд «Зелёный город»",
      description: "Экологические и социальные инициативы.",
      status: "APPROVED",
    },
  });

  const events = [
    {
      key: "EVENT_SUBBOTNIK",
      title: "Городской субботник в парке",
      description: "Уборка территории парка и высадка деревьев.",
      location: "Москва, Парк Сокольники",
      city: "Москва",
      category: "Экология",
      startsAt: daysFromNow(7),
      capacity: 50,
      rewardTokens: 80,
    },
    {
      key: "EVENT_DETSKIY_DOM",
      title: "Праздник в детском доме",
      description: "Организация творческого мастер-класса для детей.",
      location: "Санкт-Петербург, ул. Ленина 10",
      city: "Санкт-Петербург",
      category: "Дети",
      startsAt: daysFromNow(14),
      capacity: 20,
      rewardTokens: 120,
    },
    {
      key: "EVENT_DONOR",
      title: "День донора",
      description: "Сдача крови и поддержка донорского движения.",
      location: "Казань, Центр крови",
      city: "Казань",
      category: "Здоровье",
      startsAt: daysFromNow(21),
      capacity: 100,
      rewardTokens: 150,
    },
  ];
  for (const e of events) {
    const existing = await prisma.event.findFirst({
      where: { organizationId: organization.id, title: e.title },
    });
    const payload = {
      organizationId: organization.id,
      title: e.title,
      description: e.description,
      startsAt: e.startsAt,
      location: `${e.city}, ${e.location}`,
      category: e.category,
      capacity: e.capacity,
      rewardTokens: e.rewardTokens,
      status: "PUBLISHED" as const,
    };
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.event.create({ data: payload });
    }
  }

  // 8. Партнёр + награды
  const partnerUser = await upsertUser({
    email: "partner@evraziya.local",
    role: "PARTNER",
    displayName: "Кофейня «Тепло»",
    passwordHash,
    city: "Москва",
  });
  const partner = await prisma.partner.upsert({
    where: { userId: partnerUser.id },
    update: { brandName: "Кофейня «Тепло»", status: "APPROVED" },
    create: {
      userId: partnerUser.id,
      brandName: "Кофейня «Тепло»",
      description: "Сеть уютных кофеен-партнёров.",
      status: "APPROVED",
    },
  });

  const rewards = [
    {
      title: "Скидка 20% на кофе",
      description: "Скидка на любой напиток в сети кофеен.",
      type: "DISCOUNT" as const,
      costTokens: 50,
      stock: 100,
      requiresApproval: false,
    },
    {
      title: "Фирменная кружка",
      description: "Мерч-кружка с логотипом платформы.",
      type: "MERCH" as const,
      costTokens: 150,
      stock: 30,
      requiresApproval: false,
    },
    {
      title: "Билет на мастер-класс",
      description: "Доступ к образовательному мастер-классу.",
      type: "EVENT_ACCESS" as const,
      costTokens: 300,
      stock: 15,
      requiresApproval: false,
    },
    {
      title: "Поездка на эко-форум",
      description: "Поездка на всероссийский эко-форум (модерация заявки).",
      type: "TRIP" as const,
      costTokens: 1000,
      stock: 5,
      requiresApproval: true,
    },
  ];
  for (const r of rewards) {
    const existing = await prisma.reward.findFirst({
      where: { partnerId: partner.id, title: r.title },
    });
    const payload = { partnerId: partner.id, isActive: true, ...r };
    if (existing) {
      await prisma.reward.update({ where: { id: existing.id }, data: payload });
    } else {
      await prisma.reward.create({ data: payload });
    }
  }

  // 9. Миссии
  const missions = [
    {
      title: "Подпишись на Telegram-канал",
      description: "Подпишись на официальный канал платформы и сделай скриншот.",
      instruction: "Зайди в @evraziya, подпишись, пришли скриншот.",
      rewardTokens: 20,
      proofMethod: "SCREENSHOT" as const,
    },
    {
      title: "Поделись постом о волонтёрстве",
      description: "Опубликуй пост о платформе в соцсетях.",
      instruction: "Сделай репост и пришли скриншот.",
      rewardTokens: 30,
      proofMethod: "SCREENSHOT" as const,
    },
    {
      title: "Приведи друга",
      description: "Пригласи друга зарегистрироваться на платформе.",
      instruction: "Друг регистрируется — пришли скриншот его профиля.",
      rewardTokens: 50,
      proofMethod: "SCREENSHOT" as const,
    },
    {
      title: "Оставь отзыв о мероприятии",
      description: "Напиши отзыв о посещённом мероприятии.",
      instruction: "Опубликуй отзыв и пришли скриншот.",
      rewardTokens: 25,
      proofMethod: "SCREENSHOT" as const,
    },
  ];
  for (const m of missions) {
    const existing = await prisma.mission.findFirst({
      where: { title: m.title },
    });
    if (existing) {
      await prisma.mission.update({ where: { id: existing.id }, data: { ...m, isActive: true } });
    } else {
      await prisma.mission.create({ data: { ...m, isActive: true } });
    }
  }

  // 10. Сводка
  const [
    levelCount,
    ruleCount,
    badgeCount,
    userCount,
    eventCount,
    rewardCount,
    missionCount,
    txCount,
  ] = await Promise.all([
    prisma.level.count(),
    prisma.profileCompletionRule.count(),
    prisma.badge.count(),
    prisma.user.count(),
    prisma.event.count(),
    prisma.reward.count(),
    prisma.mission.count(),
    prisma.tokenTransaction.count(),
  ]);

  console.log("\n────────── SEED СВОДКА ──────────");
  console.log(`Удалено старых test_/smoke_ юзеров: ${deleted.count}`);
  console.log(`Уровни (Level):               ${levelCount}`);
  console.log(`Правила профиля (Rule):       ${ruleCount}`);
  console.log(`Бейджи (Badge):               ${badgeCount}`);
  console.log(`Пользователи (User):          ${userCount}`);
  console.log(`  └─ волонтёров:              ${volunteers.length}`);
  console.log(`Мероприятия (Event):          ${eventCount}`);
  console.log(`Награды (Reward):             ${rewardCount}`);
  console.log(`Миссии (Mission):             ${missionCount}`);
  console.log(`Транзакции токенов (Tx):      ${txCount}`);
  console.log(`Демо-пароль для всех:         ${DEMO_PASSWORD}`);
  console.log("─────────────────────────────────\n");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Ошибка seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
