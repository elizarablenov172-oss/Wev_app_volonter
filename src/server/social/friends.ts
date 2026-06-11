import { prisma } from "@/lib/prisma";

/**
 * Сервис «Друзья» (Этап 6, ТЗ 3.4).
 * Дружба двунаправленная: ищем связь в любом порядке (requester/addressee).
 */

export class SocialError extends Error {
  readonly code: "NOT_FOUND" | "FORBIDDEN" | "WRONG_STATUS" | "SELF" | "BLOCKED";
  constructor(code: SocialError["code"], message: string) {
    super(message);
    this.name = "SocialError";
    this.code = code;
  }
}

export function socialErrorStatus(e: SocialError): number {
  switch (e.code) {
    case "NOT_FOUND":
      return 404;
    case "FORBIDDEN":
    case "BLOCKED":
      return 403;
    default:
      return 409;
  }
}

const USER_CARD = {
  id: true,
  displayName: true,
  nickname: true,
  avatarUrl: true,
  city: true,
} as const;

/** Находит связь дружбы между двумя пользователями (в любом направлении). */
function findBetween(a: string, b: string) {
  return prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
  });
}

async function notify(userId: string, title: string, body: string, refId: string) {
  await prisma.notification.create({
    data: { userId, type: "FRIEND_REQUEST", title, body, refType: "friendship", refId },
  });
}

/** Отправить заявку в друзья (или принять встречную). */
export async function sendFriendRequest(fromId: string, toId: string) {
  if (fromId === toId) throw new SocialError("SELF", "Нельзя добавить себя");

  const [me, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: fromId }, select: { displayName: true } }),
    prisma.user.findUnique({ where: { id: toId }, select: { id: true } }),
  ]);
  if (!target) throw new SocialError("NOT_FOUND", "Пользователь не найден");

  const existing = await findBetween(fromId, toId);
  if (existing) {
    if (existing.status === "ACCEPTED")
      throw new SocialError("WRONG_STATUS", "Вы уже друзья");
    if (existing.status === "BLOCKED")
      throw new SocialError("BLOCKED", "Действие недоступно");
    if (existing.status === "PENDING") {
      // Встречная заявка → принимаем.
      if (existing.addresseeId === fromId) {
        const updated = await prisma.friendship.update({
          where: { id: existing.id },
          data: { status: "ACCEPTED" },
        });
        await notify(existing.requesterId, "Заявка принята", `${me?.displayName ?? "Пользователь"} принял(а) вашу заявку`, existing.id);
        return updated;
      }
      throw new SocialError("WRONG_STATUS", "Заявка уже отправлена");
    }
    // DECLINED → повторная заявка.
    const updated = await prisma.friendship.update({
      where: { id: existing.id },
      data: { requesterId: fromId, addresseeId: toId, status: "PENDING" },
    });
    await notify(toId, "Заявка в друзья", `${me?.displayName ?? "Пользователь"} хочет добавить вас в друзья`, updated.id);
    return updated;
  }

  const created = await prisma.friendship.create({
    data: { requesterId: fromId, addresseeId: toId, status: "PENDING" },
  });
  await notify(toId, "Заявка в друзья", `${me?.displayName ?? "Пользователь"} хочет добавить вас в друзья`, created.id);
  return created;
}

/** Принять входящую заявку (только адресат). */
export async function acceptRequest(userId: string, friendshipId: string) {
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f) throw new SocialError("NOT_FOUND", "Заявка не найдена");
  if (f.addresseeId !== userId) throw new SocialError("FORBIDDEN", "Нет прав");
  if (f.status !== "PENDING") throw new SocialError("WRONG_STATUS", "Заявка уже обработана");
  const updated = await prisma.friendship.update({ where: { id: f.id }, data: { status: "ACCEPTED" } });
  const me = await prisma.user.findUnique({ where: { id: userId }, select: { displayName: true } });
  await notify(f.requesterId, "Заявка принята", `${me?.displayName ?? "Пользователь"} теперь ваш друг`, f.id);
  return updated;
}

/** Отклонить входящую заявку (только адресат). */
export async function declineRequest(userId: string, friendshipId: string) {
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f) throw new SocialError("NOT_FOUND", "Заявка не найдена");
  if (f.addresseeId !== userId) throw new SocialError("FORBIDDEN", "Нет прав");
  if (f.status !== "PENDING") throw new SocialError("WRONG_STATUS", "Заявка уже обработана");
  return prisma.friendship.update({ where: { id: f.id }, data: { status: "DECLINED" } });
}

/** Удалить из друзей / отменить свою заявку (любой участник связи). */
export async function removeFriendship(userId: string, friendshipId: string) {
  const f = await prisma.friendship.findUnique({ where: { id: friendshipId } });
  if (!f) throw new SocialError("NOT_FOUND", "Связь не найдена");
  if (f.requesterId !== userId && f.addresseeId !== userId)
    throw new SocialError("FORBIDDEN", "Нет прав");
  await prisma.friendship.delete({ where: { id: f.id } });
}

/** Списки: друзья + входящие + исходящие заявки. */
export async function listFriends(userId: string) {
  const [accepted, incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { status: "ACCEPTED", OR: [{ requesterId: userId }, { addresseeId: userId }] },
      include: { requester: { select: USER_CARD }, addressee: { select: USER_CARD } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { status: "PENDING", addresseeId: userId },
      include: { requester: { select: USER_CARD } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { status: "PENDING", requesterId: userId },
      include: { addressee: { select: USER_CARD } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    friends: accepted.map((f) => ({
      friendshipId: f.id,
      user: f.requesterId === userId ? f.addressee : f.requester,
    })),
    incoming: incoming.map((f) => ({ friendshipId: f.id, user: f.requester })),
    outgoing: outgoing.map((f) => ({ friendshipId: f.id, user: f.addressee })),
  };
}

/** Поиск пользователей по имени/нику с относительным статусом дружбы. */
export async function searchUsers(query: string, meId: string) {
  const q = query.trim();
  if (q.length < 2) return [];

  const users = await prisma.user.findMany({
    where: {
      id: { not: meId },
      isBlocked: false,
      OR: [
        { displayName: { contains: q, mode: "insensitive" } },
        { nickname: { contains: q, mode: "insensitive" } },
      ],
    },
    select: USER_CARD,
    take: 20,
  });

  const links = await prisma.friendship.findMany({
    where: {
      OR: users.flatMap((u) => [
        { requesterId: meId, addresseeId: u.id },
        { requesterId: u.id, addresseeId: meId },
      ]),
    },
  });

  return users.map((u) => {
    const link = links.find(
      (l) =>
        (l.requesterId === meId && l.addresseeId === u.id) ||
        (l.requesterId === u.id && l.addresseeId === meId),
    );
    let relation: "none" | "friends" | "incoming" | "outgoing" = "none";
    let friendshipId: string | null = null;
    if (link) {
      friendshipId = link.id;
      if (link.status === "ACCEPTED") relation = "friends";
      else if (link.status === "PENDING")
        relation = link.requesterId === meId ? "outgoing" : "incoming";
    }
    return { user: u, relation, friendshipId };
  });
}

/** Проверка: являются ли два пользователя друзьями (для чата). */
export async function areFriends(a: string, b: string): Promise<boolean> {
  const f = await prisma.friendship.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requesterId: a, addresseeId: b },
        { requesterId: b, addresseeId: a },
      ],
    },
    select: { id: true },
  });
  return Boolean(f);
}
