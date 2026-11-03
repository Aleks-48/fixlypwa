import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  Bot,
  ClipboardList,
  FileText,
  FolderOpen,
  Info,
  Landmark,
  LayoutDashboard,
  Newspaper,
  Settings,
  User,
  Vote,
  Wallet,
  Wrench,
} from "lucide-react";
import type { DictionaryKey } from "@/lib/i18n/dictionaries";

export type NavItem = {
  href: string;
  labelKey: DictionaryKey;
  label: string; // Запасной дефолтный текст
  icon: LucideIcon;
  secondary?: boolean;
};

// Единый источник пунктов навигации кабинета
export function buildNavItems(role: "chairman" | "resident", bId?: string): NavItem[] {
  if (role === "resident") {
    return [
      { href: "/app", labelKey: "nav_dashboard", label: "Главная", icon: LayoutDashboard },
      { href: "/app/polls", labelKey: "nav_polls", label: "Голосования", icon: Vote },
      { href: "/app/requests", labelKey: "nav_requests", label: "Мои заявки", icon: ClipboardList },
      { href: "/app/complaints", labelKey: "nav_complaints", label: "Жалобы и мусор", icon: AlertTriangle },
      { href: "/app/payments", labelKey: "nav_payments", label: "Финансы", icon: Wallet },
      { href: "/app/profile", labelKey: "nav_profile", label: "Профиль", icon: User },
      { href: "/app/documents", labelKey: "nav_documents", label: "Документы", icon: FolderOpen },
      { href: "/app/masters", labelKey: "nav_masters", label: "Мастера", icon: Wrench },
      { href: "/app/assistant", labelKey: "nav_assistant", label: "AI-помощник", icon: Bot },
      { href: "/app/settings", labelKey: "nav_settings", label: "Настройки", icon: Settings },
      { href: "/app/news", labelKey: "nav_news", label: "Новости", icon: Newspaper, secondary: true },
      { href: "/app/info", labelKey: "nav_info", label: "Инфо дома", icon: Info, secondary: true },
    ];
  }
  const base: NavItem[] = [{ href: "/app", labelKey: "nav_dashboard", label: "Главная", icon: LayoutDashboard }];
  if (!bId) return base;
  return [
    ...base,
    { href: `/app/buildings/${bId}/polls`, labelKey: "nav_polls", label: "Голосования", icon: Vote },
    { href: `/app/buildings/${bId}/requests`, labelKey: "nav_requests_chairman", label: "Заявки", icon: ClipboardList },
    { href: `/app/buildings/${bId}/finance`, labelKey: "nav_payments", label: "Финансы", icon: Wallet },
    { href: "/app/bank-import", labelKey: "nav_bank_import", label: "Импорт выписки", icon: Landmark },
    { href: `/app/buildings/${bId}/announcements`, labelKey: "nav_announcements", label: "Объявления", icon: Newspaper },
    { href: `/app/buildings/${bId}/reports`, labelKey: "nav_reports", label: "Отчёты", icon: FileText, secondary: true },
    { href: `/app/buildings/${bId}/info`, labelKey: "nav_info", label: "Инфо дома", icon: Info, secondary: true },
    { href: `/app/buildings/${bId}/documents`, labelKey: "nav_documents", label: "Документы", icon: FolderOpen, secondary: true },
    { href: "/app/masters", labelKey: "nav_masters", label: "Мастера", icon: Wrench, secondary: true },
    { href: "/app/assistant", labelKey: "nav_assistant", label: "AI-помощник", icon: Bot, secondary: true },
    { href: `/app/buildings/${bId}/settings`, labelKey: "nav_settings", label: "Настройки", icon: Settings, secondary: true },
  ];
}

// Активный пункт: точное совпадение для корня, префикс для остальных.
export function isNavActive(href: string, pathname: string): boolean {
  return href === "/app" ? pathname === "/app" : pathname.startsWith(href);
}
