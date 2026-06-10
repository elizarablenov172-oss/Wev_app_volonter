import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  EventDetailResponse,
  EventListResponse,
  ModerationEventItem,
  OrgEventItem,
  ParticipantsResponse,
} from "@/lib/events";

/**
 * Серверные read-запросы Этапа 4 для рендера страниц (как wallet/profile
 * читают данные напрямую через Prisma). Формы результата ПОВТОРЯЮТ контракты
 * соответствующих GET-эндпоинтов /api/events*, /api/org/events*, /api/admin/*.
 * Мутации (join/checkin/confirm/create/edit/moderate) идут через API.
 */

const PAGE_SIZE_DEFAULT = 12;

export interface EventListFilters {
  city?: string;
  category?: string;
  date?: string;
  page?: number;
  pageSize?: number;
}

/** Публичный список PUBLISHED-мероприятий (зеркало GET /api/events). */
export async function getPublicEvents(
  filters: EventListFilters,
): Promise<EventListResponse> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, filters.pageSize ?? PAGE_SIZE_DEFAULT));

  let fromDate = new Date();
  if (filters.date) {
    const parsed = new Date(filters.date);
    if (!Number.isNaN(parsed.getTime())) {
      parsed.setHours(0, 0, 0, 0);
      fromDate = parsed;
    }
  }

  const where: Prisma.EventWhereInput = {
    status: "PUBLISHED",
    startsAt: { gte: fromDate },
  };
  if (filters.city) where.location = { contains: filters.city, mode: "insensitive" };
  if (filters.category) where.category = filters.category;

  const [total, events] = await Promise.all([
    prisma.event.count({ where }),
    prisma.event.findMany({
      where,
      orderBy: { startsAt: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        title: true,
        description: true,
        startsAt: true,
        location: true,
        geoLat: true,
        geoLng: true,
        capacity: true,
        category: true,
        rewardTokens: true,
        status: true,
        organization: { select: { id: true, name: true } },
        _count: {
          select: { participations: { where: { status: { not: "CANCELLED" } } } },
        },
      },
    }),
  ]);

  const items = events.map((e) => {
    const { _count, ...rest } = e;
    return {
      ...rest,
      startsAt: rest.startsAt.toISOString(),
      participantsCount: _count.participations,
      spotsLeft: Math.max(0, e.capacity - _count.participations),
    };
  });

  return {
    items,
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Деталь мероприятия + участие текущего пользователя (зеркало GET /api/events/[id]). */
export async function getEventDetail(
  id: string,
  viewerId: string | null,
): Promise<EventDetailResponse | null> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      location: true,
      geoLat: true,
      geoLng: true,
      capacity: true,
      category: true,
      rewardTokens: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      organization: {
        select: { id: true, userId: true, name: true, description: true },
      },
      _count: {
        select: { participations: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });
  if (!event) return null;

  const isOwner = viewerId != null && viewerId === event.organization.userId;
  if (event.status !== "PUBLISHED" && !isOwner) return null;

  let myParticipation: EventDetailResponse["myParticipation"] = null;
  if (viewerId) {
    const p = await prisma.participation.findUnique({
      where: { userId_eventId: { userId: viewerId, eventId: id } },
      select: {
        id: true,
        status: true,
        checkInMethod: true,
        checkedInAt: true,
        rewarded: true,
      },
    });
    if (p) {
      myParticipation = {
        id: p.id,
        status: p.status,
        checkInMethod: p.checkInMethod,
        checkedInAt: p.checkedInAt ? p.checkedInAt.toISOString() : null,
        rewarded: p.rewarded,
      };
    }
  }

  const { _count, organization, ...rest } = event;
  const participantsCount = _count.participations;

  return {
    event: {
      ...rest,
      startsAt: rest.startsAt.toISOString(),
      createdAt: rest.createdAt.toISOString(),
      updatedAt: rest.updatedAt.toISOString(),
      organization: {
        id: organization.id,
        name: organization.name,
        description: organization.description,
      },
      participantsCount,
      spotsLeft: Math.max(0, event.capacity - participantsCount),
    },
    isOwner,
    myParticipation,
  };
}

/** Мероприятия организации (зеркало GET /api/org/events). */
export async function getOrgEvents(userId: string): Promise<OrgEventItem[]> {
  const organization = await prisma.organization.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!organization) return [];

  const events = await prisma.event.findMany({
    where: { organizationId: organization.id },
    orderBy: { startsAt: "desc" },
    select: {
      id: true,
      title: true,
      startsAt: true,
      location: true,
      category: true,
      capacity: true,
      rewardTokens: true,
      status: true,
      createdAt: true,
      _count: {
        select: { participations: { where: { status: { not: "CANCELLED" } } } },
      },
    },
  });

  return events.map(({ _count, ...e }) => ({
    ...e,
    startsAt: e.startsAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
    participantsCount: _count.participations,
  }));
}

/** Одно мероприятие организации для редактирования (только владелец). */
export async function getOrgEventForEdit(id: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      location: true,
      geoLat: true,
      geoLng: true,
      capacity: true,
      category: true,
      status: true,
      organization: { select: { userId: true } },
    },
  });
  if (!event || event.organization.userId !== userId) return null;
  const { organization, ...rest } = event;
  void organization;
  return { ...rest, startsAt: rest.startsAt.toISOString() };
}

/** Участники мероприятия (зеркало GET /api/org/events/[id]/participants). */
export async function getEventParticipants(
  id: string,
  userId: string,
): Promise<ParticipantsResponse | null> {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      capacity: true,
      organization: { select: { userId: true } },
    },
  });
  if (!event || event.organization.userId !== userId) return null;

  const participations = await prisma.participation.findMany({
    where: { eventId: id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      checkInMethod: true,
      checkedInAt: true,
      rewarded: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          displayName: true,
          nickname: true,
          avatarUrl: true,
          city: true,
        },
      },
    },
  });

  const items = participations.map((p) => ({
    participationId: p.id,
    status: p.status,
    checkInMethod: p.checkInMethod,
    checkedInAt: p.checkedInAt ? p.checkedInAt.toISOString() : null,
    rewarded: p.rewarded,
    joinedAt: p.createdAt.toISOString(),
    user: p.user,
  }));

  const activeCount = items.filter((p) => p.status !== "CANCELLED").length;

  return {
    event: { id: event.id, title: event.title, capacity: event.capacity },
    participantsCount: activeCount,
    items,
  };
}

/** QR-данные мероприятия (только владелец). qrSecret НЕ генерируем здесь — только читаем. */
export async function getEventQrData(id: string, userId: string) {
  const event = await prisma.event.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      qrSecret: true,
      status: true,
      organization: { select: { userId: true } },
    },
  });
  if (!event || event.organization.userId !== userId) return null;
  return event;
}

/** Очередь модерации PENDING (зеркало GET /api/admin/events/moderation). */
export async function getModerationQueue(): Promise<ModerationEventItem[]> {
  const events = await prisma.event.findMany({
    where: { status: "PENDING" },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      startsAt: true,
      location: true,
      category: true,
      capacity: true,
      rewardTokens: true,
      createdAt: true,
      organization: { select: { id: true, name: true, status: true } },
    },
  });

  return events.map((e) => ({
    ...e,
    startsAt: e.startsAt.toISOString(),
    createdAt: e.createdAt.toISOString(),
  }));
}
