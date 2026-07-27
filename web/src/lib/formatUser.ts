/**
 * Форматирует имя для узких блоков (сайдбар):
 * если длиннее 15 символов — "Александр Н.", иначе "Александр Новокрещенов"
 */
// src/lib/formatUser.ts

export function formatUserName(name?: string, surname?: string): string {
  if (!name) return "";
  if (!surname) return name;
  return `${name} ${surname[0]}.`;
}

// Алиас для layout.tsx
export const formatSidebarName = formatUserName;

export function getUserInitials(name?: string, surname?: string): string {
  const firstLetter = name ? name[0] : "";
  const lastLetter = surname ? surname[0] : "";
  return `${firstLetter}${lastLetter}`.toUpperCase();
}
