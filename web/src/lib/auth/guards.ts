import type { Role, User } from "@prisma/client";
import type { AuthContext } from "./session";

// Серверная авторизация по ролям (REQ-003, user-roles.md §2). Чистые функции над AuthContext —
// проверка прав ВСЕГДА на сервере, не только в UI.

export function roleFor(auth: AuthContext, osiId: string): Role | null {
  return auth.user.roles.find((r) => r.osiId === osiId)?.role ?? null;
}

export function hasRole(auth: AuthContext, osiId: string, ...roles: Role[]): boolean {
  const r = roleFor(auth, osiId);
  return r !== null && roles.includes(r);
}

// Активная ОСИ, в которой пользователь имеет права председателя (или суперадмина) — основа
// tenant-скоупа для управляющих операций. null → нет прав/не выбрана ОСИ.
export function activeChairmanOsi(auth: AuthContext): string | null {
  const osiId = auth.session.activeOsiId;
  if (!osiId) return null;
  return hasRole(auth, osiId, "CHAIRMAN", "SUPERADMIN") ? osiId : null;
}

// Активная ОСИ, где пользователь имеет ЛЮБУЮ роль (для read-путей жителя) — tenant-скоуп чтения.
export function activeMemberOsi(auth: AuthContext): string | null {
  const osiId = auth.session.activeOsiId;
  if (!osiId) return null;
  return roleFor(auth, osiId) !== null ? osiId : null;
}

// Безопасное представление пользователя наружу — без passwordHash и прочих секретов.
export function publicUser(user: User) {
  return { id: user.id, phone: user.phone, email: user.email, fullName: user.fullName };
}
