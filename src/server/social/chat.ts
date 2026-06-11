import { prisma } from "@/lib/prisma";
import { SocialError, areFriends } from "@/server/social/friends";

/**
 * Сервис «Чат» (Этап 6, ТЗ 3.4). Диалоги доступны только между друзьями.
 * Уникальность диалога: пара (userAId, userBId) нормализуется (id меньший — A).
 */

const USER_CARD = {
  id: true,
  displayName: true,
  nickname: true,
  avatarUrl: true,
} as const;

/** Нормализует пару id, чтобы у пары был единственный диалог. */
function orderPair(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

/** Получить (или создать) диалог с другом. */
export async function getOrCreateDialog(meId: string, otherId: string) {
  if (meId === otherId) throw new SocialError("SELF", "Нельзя писать самому себе");
  if (!(await areFriends(meId, otherId)))
    throw new SocialError("FORBIDDEN", "Переписка доступна только с друзьями");

  const [userAId, userBId] = orderPair(meId, otherId);
  const dialog = await prisma.dialog.upsert({
    where: { userAId_userBId: { userAId, userBId } },
    create: { userAId, userBId },
    update: {},
    include: { userA: { select: USER_CARD }, userB: { select: USER_CARD } },
  });
  return dialog;
}

/** Список диалогов пользователя: собеседник + последнее сообщение + непрочитанные. */
export async function listDialogs(meId: string) {
  const dialogs = await prisma.dialog.findMany({
    where: { OR: [{ userAId: meId }, { userBId: meId }] },
    include: {
      userA: { select: USER_CARD },
      userB: { select: USER_CARD },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });

  const withMeta = await Promise.all(
    dialogs.map(async (d) => {
      const other = d.userAId === meId ? d.userB : d.userA;
      const unread = await prisma.message.count({
        where: { dialogId: d.id, senderId: { not: meId }, readAt: null },
      });
      const last = d.messages[0] ?? null;
      return {
        id: d.id,
        user: other,
        unread,
        lastMessage: last
          ? { text: last.text, createdAt: last.createdAt.toISOString(), mine: last.senderId === meId }
          : null,
        lastAt: (last?.createdAt ?? d.createdAt).toISOString(),
      };
    }),
  );

  // Сортируем по времени последней активности.
  withMeta.sort((a, b) => (a.lastAt < b.lastAt ? 1 : -1));
  return withMeta;
}

/** Загружает диалог, проверяя, что пользователь — участник. */
async function requireParticipantDialog(meId: string, dialogId: string) {
  const dialog = await prisma.dialog.findUnique({
    where: { id: dialogId },
    include: { userA: { select: USER_CARD }, userB: { select: USER_CARD } },
  });
  if (!dialog) throw new SocialError("NOT_FOUND", "Диалог не найден");
  if (dialog.userAId !== meId && dialog.userBId !== meId)
    throw new SocialError("FORBIDDEN", "Нет доступа к диалогу");
  return dialog;
}

/** Сообщения диалога (по возрастанию) + собеседник. Помечает входящие прочитанными. */
export async function getDialogMessages(meId: string, dialogId: string) {
  const dialog = await requireParticipantDialog(meId, dialogId);
  const other = dialog.userAId === meId ? dialog.userB : dialog.userA;

  const messages = await prisma.message.findMany({
    where: { dialogId },
    orderBy: { createdAt: "asc" },
    take: 200,
    select: { id: true, senderId: true, text: true, readAt: true, createdAt: true },
  });

  // Пометить входящие прочитанными.
  await prisma.message.updateMany({
    where: { dialogId, senderId: { not: meId }, readAt: null },
    data: { readAt: new Date() },
  });

  return {
    dialogId,
    user: other,
    messages: messages.map((m) => ({
      id: m.id,
      text: m.text,
      mine: m.senderId === meId,
      readAt: m.readAt ? m.readAt.toISOString() : null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

/** Отправить сообщение в диалог. */
export async function sendMessage(meId: string, dialogId: string, text: string) {
  const dialog = await requireParticipantDialog(meId, dialogId);
  const clean = text.trim();
  if (!clean) throw new SocialError("WRONG_STATUS", "Пустое сообщение");

  const message = await prisma.message.create({
    data: { dialogId, senderId: meId, text: clean.slice(0, 4000) },
  });

  const otherId = dialog.userAId === meId ? dialog.userBId : dialog.userAId;
  const me = await prisma.user.findUnique({ where: { id: meId }, select: { displayName: true } });
  await prisma.notification.create({
    data: {
      userId: otherId,
      type: "NEW_MESSAGE",
      title: "Новое сообщение",
      body: `${me?.displayName ?? "Пользователь"}: ${clean.slice(0, 80)}`,
      refType: "dialog",
      refId: dialogId,
    },
  });

  return {
    id: message.id,
    text: message.text,
    mine: true,
    readAt: null,
    createdAt: message.createdAt.toISOString(),
  };
}

/** Пометить входящие сообщения диалога прочитанными. */
export async function markDialogRead(meId: string, dialogId: string) {
  await requireParticipantDialog(meId, dialogId);
  await prisma.message.updateMany({
    where: { dialogId, senderId: { not: meId }, readAt: null },
    data: { readAt: new Date() },
  });
}
