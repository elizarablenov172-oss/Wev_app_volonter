import type { Icon } from "@phosphor-icons/react";
import {
  House,
  CalendarDots,
  ListChecks,
  Storefront,
  User,
  Wallet,
  UsersThree,
  ChatCircle,
  Buildings,
  Tag,
  ShieldCheck,
  CalendarCheck,
  Gift,
  Megaphone,
} from "@phosphor-icons/react/dist/ssr";
import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: Icon;
  /** Группа в боковом меню — задаёт тонкие разделители между смысловыми блоками. */
  group?: "main" | "account" | "manage";
  /** Показывать в нижней мобильной навигации (макс. 5 пунктов). */
  bottom?: boolean;
}

const volunteerNav: NavItem[] = [
  { href: "/feed", label: "Лента", icon: House, group: "main", bottom: true },
  { href: "/events", label: "Мероприятия", icon: CalendarDots, group: "main", bottom: true },
  { href: "/missions", label: "Задания", icon: ListChecks, group: "main", bottom: true },
  { href: "/marketplace", label: "Маркет", icon: Storefront, group: "main", bottom: true },
  { href: "/profile", label: "Профиль", icon: User, group: "account", bottom: true },
  { href: "/wallet", label: "Кошелёк", icon: Wallet, group: "account" },
  { href: "/friends", label: "Друзья", icon: UsersThree, group: "account" },
  { href: "/chats", label: "Чаты", icon: ChatCircle, group: "account" },
];

const orgNav: NavItem[] = [
  { href: "/org", label: "Дашборд", icon: House, group: "main", bottom: true },
  { href: "/org/events", label: "Мероприятия", icon: CalendarDots, group: "manage", bottom: true },
  { href: "/org/participants", label: "Участники", icon: UsersThree, group: "manage", bottom: true },
  { href: "/profile", label: "Профиль", icon: User, group: "account", bottom: true },
];

const partnerNav: NavItem[] = [
  { href: "/partner", label: "Дашборд", icon: House, group: "main", bottom: true },
  { href: "/partner/rewards", label: "Награды", icon: Gift, group: "manage", bottom: true },
  { href: "/partner/redemptions", label: "Заявки", icon: Tag, group: "manage", bottom: true },
  { href: "/profile", label: "Профиль", icon: User, group: "account", bottom: true },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Дашборд", icon: House, group: "main", bottom: true },
  { href: "/admin/moderation", label: "Модерация", icon: ShieldCheck, group: "manage", bottom: true },
  { href: "/admin/moderation/events", label: "Мероприятия", icon: CalendarCheck, group: "manage", bottom: true },
  { href: "/admin/missions", label: "Задания", icon: Megaphone, group: "manage" },
  { href: "/admin/orgs", label: "Организации", icon: Buildings, group: "manage" },
  { href: "/admin/users", label: "Пользователи", icon: UsersThree, group: "manage", bottom: true },
];

/** Возвращает набор пунктов навигации для роли. */
export function getNavForRole(role: Role): NavItem[] {
  switch (role) {
    case "ORGANIZATION":
      return orgNav;
    case "PARTNER":
      return partnerNav;
    case "ADMIN":
      return adminNav;
    case "VOLUNTEER":
    default:
      return volunteerNav;
  }
}
