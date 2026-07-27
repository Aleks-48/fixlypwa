import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import type { Prisma, Session, User, UserOsiRole } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { env } from "@/lib/env";
import { generateSessionToken, hashToken } from "./crypto";

export const SESSION_COOKIE = "osi_session";

export type AuthContext = {
  user: User & { roles: UserOsiRole[] };
  session: Session;
  tenantId?: string | null;
  osiId?: string | null;
};

function ttlMs(): number {
  return (env.SESSION_TTL_DAYS || 30) * 24 * 60 * 60 * 1000;
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
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

async function readToken(): Promise<string | null> {
  return (await cookies()).get(SESSION_COOKIE)?.value ?? null;
}

export const getCurrentAuth = cache(async (): Promise<AuthContext | null> => {
  const token = await readToken();
  if (!token) return null;

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
  const tenantId = bare.activeOsiId ?? user.roles[0]?.osiId ?? null;

  return { user, session: bare as Session, tenantId, osiId: tenantId };
});

// Экспорт алиасов для совместимости со всеми модулями
export const getAuthContext = getCurrentAuth;
export const getAuth = getCurrentAuth;

export async function destroyCurrentSession(): Promise<void> {
  const token = await readToken();
  if (token) {
    await prisma.session.delete({ where: { id: hashToken(token) } }).catch(() => {});
  }
  await clearSessionCookie();
}

export async function setActiveOsi(sessionId: string, osiId: string | null): Promise<void> {
  await prisma.session.update({ where: { id: sessionId }, data: { activeOsiId: osiId } });
}

export function pickDefaultOsi(roles: Pick<UserOsiRole, "osiId">[]): string | null {
  return roles[0]?.osiId ?? null;
}

export type Tx = Prisma.TransactionClient;