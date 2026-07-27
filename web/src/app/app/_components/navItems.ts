import type { LucideIcon } from "lucide-react";
import {
  Bot,
  ClipboardList,
  FileText,
  FolderOpen,
  Info,
  Landmark, // <-- Добавлена иконка для импорта выписки
  LayoutDashboard,
  Newspaper,
  Scale,
  Settings,
  User,
  Vote,
  Wallet,
  Wrench,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  secondary?: boolean; // вторичная группа (мельче/ниже в списке)
};

// Единый источник пунктов навигации кабинета — сайдбар (lg+) и мобильное меню-шторка
// рисуют ОДИН и тот же список (ui-redesign.md §3). bId — активный дом председателя.
export function buildNavItems(role: "chairman" | "resident", bId?: string): NavItem[] {
  if (role === "resident") {
    // 4 главные вкладки (заметки п.7): Обзор / Голосования / Заявки / Финансы(платежи+отчёты).
    // Новости живут лентой на Обзоре (+ /app/news вторичным пунктом), Профиль — из меню/сайдбара.
    return [
      { href: "/app", label: "Главная", icon: LayoutDashboard },
      { href: "/app/polls", label: "Голосования", icon: Vote },
      { href: "/app/legal-voting", label: "Юрид. голосования", icon: Scale },
      { href: "/app/requests", label: "Мои заявки", icon: ClipboardList },
      { href: "/app/payments", label: "Финансы", icon: Wallet },
      { href: "/app/profile", label: "Профиль", icon: User },
      { href: "/app/documents", label: "Документы", icon: FolderOpen },
      { href: "/app/masters", label: "Мастера", icon: Wrench },
      { href: "/app/assistant", label: "AI-помощник", icon: Bot },
      { href: "/app/settings", label: "Настройки", icon: Settings },
      { href: "/app/news", label: "Новости", icon: Newspaper, secondary: true },
      { href: "/app/info", label: "Инфо дома", icon: Info, secondary: true },
    ];
  }
  const base: NavItem[] = [{ href: "/app", label: "Главная", icon: LayoutDashboard }];
  if (!bId) return base;
  return [
    ...base,
    { href: `/app/buildings/${bId}/polls`, label: "Голосования", icon: Vote },
    { href: `/app/buildings/${bId}/legal-voting`, label: "Юрид. голосования", icon: Scale },
    { href: `/app/buildings/${bId}/requests`, label: "Заявки", icon: ClipboardList },
    { href: `/app/buildings/${bId}/finance`, label: "Финансы", icon: Wallet },
    { href: "/app/bank-import", label: "Импорт выписки", icon: Landmark }, // <-- Добавлен активный раздел импорта
    { href: `/app/buildings/${bId}/announcements`, label: "Объявления", icon: Newspaper },
    { href: `/app/buildings/${bId}/reports`, label: "Отчёты", icon: FileText, secondary: true },
    { href: `/app/buildings/${bId}/info`, label: "Инфо дома", icon: Info, secondary: true },
    { href: `/app/buildings/${bId}/documents`, label: "Документы", icon: FolderOpen, secondary: true },
    { href: "/app/masters", label: "Мастера", icon: Wrench, secondary: true },
    { href: "/app/assistant", label: "AI-помощник", icon: Bot, secondary: true },
    { href: `/app/buildings/${bId}/settings`, label: "Настройки", icon: Settings, secondary: true },
  ];
}

// Активный пункт: точное совпадение для корня, префикс для остальных.
export function isNavActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}