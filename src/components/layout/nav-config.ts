import type { LucideIcon } from "lucide-react";
import {
  Home,
  Calendar,
  ListChecks,
  Store,
  User,
  Wallet,
  Users,
  MessageCircle,
  Building2,
  Tag,
  ShieldCheck,
  CalendarCog,
  Gift,
  Megaphone,
} from "lucide-react";
import type { Role } from "@prisma/client";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Показывать в нижней мобильной навигации (макс. 5 пунктов). */
  bottom?: boolean;
}

const volunteerNav: NavItem[] = [
  { href: "/feed", label: "Лента", icon: Home, bottom: true },
  { href: "/events", label: "Мероприятия", icon: Calendar, bottom: true },
  { href: "/missions", label: "Задания", icon: ListChecks, bottom: true },
  { href: "/marketplace", label: "Маркет", icon: Store, bottom: true },
  { href: "/profile", label: "Профиль", icon: User, bottom: true },
  { href: "/wallet", label: "Кошелёк", icon: Wallet },
  { href: "/friends", label: "Друзья", icon: Users },
  { href: "/chats", label: "Чаты", icon: MessageCircle },
];

const orgNav: NavItem[] = [
  { href: "/org", label: "Дашборд", icon: Home, bottom: true },
  { href: "/org/events", label: "Мероприятия", icon: Calendar, bottom: true },
  { href: "/org/participants", label: "Участники", icon: Users, bottom: true },
  { href: "/profile", label: "Профиль", icon: User, bottom: true },
];

const partnerNav: NavItem[] = [
  { href: "/partner", label: "Дашборд", icon: Home, bottom: true },
  { href: "/partner/rewards", label: "Награды", icon: Gift, bottom: true },
  { href: "/partner/redemptions", label: "Заявки", icon: Tag, bottom: true },
  { href: "/profile", label: "Профиль", icon: User, bottom: true },
];

const adminNav: NavItem[] = [
  { href: "/admin", label: "Дашборд", icon: Home, bottom: true },
  { href: "/admin/moderation", label: "Модерация", icon: ShieldCheck, bottom: true },
  { href: "/admin/events", label: "Мероприятия", icon: CalendarCog, bottom: true },
  { href: "/admin/missions", label: "Задания", icon: Megaphone },
  { href: "/admin/orgs", label: "Организации", icon: Building2 },
  { href: "/admin/users", label: "Пользователи", icon: Users, bottom: true },
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
