import { createHash, randomBytes } from "node:crypto";

// Aitu Passport (Digital ID Казахстана, BTS Digital) — OAuth 2.0/OIDC code flow по официальной
// документации docs.passport.aitu.io (проверено 2026-07-02). РАБОЧИЙ адаптер: активируется
// партнёрскими ключами (AITU_CLIENT_ID/SECRET — выдаёт BTS Digital по договору партнёрства).
// Без ключей aituConfigured()=false и кнопка входа скрыта. Токены — только server-side
// (client_secret не покидает сервер). ИИН из claims в MVP НЕ сохраняем (ПДн, NFR-051).

const DEFAULT_BASE = "https://passport.aitu.io";

export function aituConfigured(): boolean {
  return Boolean(process.env.AITU_CLIENT_ID && process.env.AITU_CLIENT_SECRET);
}

function baseUrl(): string {
  return process.env.AITU_BASE_URL || DEFAULT_BASE;
}

export function generateState(): string {
  return randomBytes(16).toString("base64url");
}

export function hashState(state: string): string {
  return createHash("sha256").update(state).digest("hex");
}

// Постоянное по времени сравнение хеша state из cookie с пришедшим в callback (CSRF-защита).
export function verifyState(cookieHash: string | undefined, state: string | null): boolean {
  if (!cookieHash || !state) return false;
  return cookieHash === hashState(state);
}

export function buildAuthorizeUrl(redirectUri: string, state: string): string {
  const u = new URL("/oauth2/auth", baseUrl());
  u.searchParams.set("response_type", "code");
  u.searchParams.set("client_id", process.env.AITU_CLIENT_ID ?? "");
  u.searchParams.set("redirect_uri", redirectUri);
  u.searchParams.set("scope", "openid phone");
  u.searchParams.set("state", state);
  return u.toString();
}

export type AituTokens = { access_token: string; id_token?: string };
export type AituUserInfo = { phone_number?: string; sub: string };

// Обмен кода на токены (api/v1/oauth/token, docs.passport.aitu.io). Код одноразовый, TTL 5 мин.
export async function exchangeCode(code: string, redirectUri: string): Promise<AituTokens> {
  const res = await fetch(new URL("/api/v1/oauth/token", baseUrl()), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: process.env.AITU_CLIENT_ID ?? "",
      client_secret: process.env.AITU_CLIENT_SECRET ?? "",
    }),
  });
  if (!res.ok) throw new Error(`Aitu token exchange failed: ${res.status}`);
  return (await res.json()) as AituTokens;
}

export async function fetchUserInfo(accessToken: string): Promise<AituUserInfo> {
  const res = await fetch(new URL("/api/v1/oauth/userinfo", baseUrl()), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Aitu userinfo failed: ${res.status}`);
  return (await res.json()) as AituUserInfo;
}
