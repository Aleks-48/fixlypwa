import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import type { Prisma, Session, User, UserOsiRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { generateSessionToken, hashToken } from "./crypto";

// Самописные сессии (ADR-0005). Session.id = sha256(token); сырой токен живёт в cookie (веб)
// или передаётся клиентом в заголовке Authorization: Bearer (нативный клиент, ADR-0012 §1) —
// модель сессии (TTL, activeOsiId, инвалидация) общая для обоих транспортов.
export const SESSION_COOKIE = "osi_session";

// Мобильный клиент запрашивается явным заголовком, а не автоопределением User-Agent —
// см. REQ-123. ⚠️ Заголовок клиентом не подделывается ради привилегий (он лишь выбирает
// ФОРМАТ ответа при login/otp-verify — тело с токеном вместо httpOnly-cookie), но стоит
// помнить: XSS на странице входа теоретически может запросить mobile-ответ и получить сырой
// токен в JSON, тогда как обычный login отдаёт его только в httpOnly-cookie (недоступной JS).
// Отдельный домен/поддомен для мобильного API снял бы это полностью — вне объёма среза 19.
export function isMobileClient(req: Request): boolean {
  return req.headers.get("x-client") === "mobile";
}

export type AuthContext = {
  user: User & { roles: UserOsiRole[] };
  session: Session;
};

function ttlMs(): number {
  return env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;
}

export async function createSession(
  userId: string,
  activeOsiId: string | null,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + ttlMs());
  await prisma.session.create({
    data: { id: hashToken(token), userId, activeOsiId, expiresAt },
  });
  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    // Secure только в проде: локальный dev по http:// иначе не увидит cookie.
    secure: env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

async function readToken(): Promise<string | null> {
  const cookieToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (cookieToken) return cookieToken;
  // Фолбэк на Bearer — нативный клиент без cookie jar (ADR-0012 §1, REQ-122). headers(),
  // как и cookies(), читает request-scoped контекст без явной передачи Request.
  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    return token || null;
  }
  return null;
}

// Текущий вход: cookie → хеш → сессия (+ пользователь, роли, occupant). Истёкшие удаляем.
// React cache: layout + страница + шапка зовут getCurrentAuth в одном запросе — БД дёргается один раз.
export const getCurrentAuth = cache(async (): Promise<AuthContext | null> => {
  const token = await readToken();
  if (!token) return null;

  // ВНИМАНИЕ: occupant — tenant-таблица под RLS, её нельзя грузить здесь (без forTenant вернёт
  // null). Членство/ОСИ жителя определяем по UserOsiRole (identity, вне RLS); дом/квартиру —
  // через getOccupantBuilding (forTenant) там, где это нужно.
  const session = await prisma.session.findUnique({
    where: { id: hashToken(token) },
    include: { user: { include: { roles: true } } },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }

  const { user, ...bare } = session;
  return { user, session: bare as Session };
});

export async function destroyCurrentSession(): Promise<void> {
  const token = await readToken();
  if (token) {
    await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {});
  }
  await clearSessionCookie();
}

// Смена активной ОСИ председателем (REQ-004). Вызывающий обязан проверить, что у пользователя
// есть роль в этой ОСИ (см. guards.ts).
export async function setActiveOsi(sessionId: string, osiId: string | null): Promise<void> {
  await prisma.session.update({ where: { id: sessionId }, data: { activeOsiId: osiId } });
}

// Значение активной ОСИ по умолчанию при входе: первая роль пользователя (UserOsiRole —
// identity-таблица, для жителя это его ОСИ; для председателя — его ОСИ).
export function pickDefaultOsi(roles: Pick<UserOsiRole, "osiId">[]): string | null {
  return roles[0]?.osiId ?? null;
}

// Реэкспорт типа транзакции для guard-хелперов, живущих рядом.
export type Tx = Prisma.TransactionClient;
