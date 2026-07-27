import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { normalizeKzPhone } from "@/lib/phone";
import { createSession, setSessionCookie, pickDefaultOsi } from "@/lib/auth/session";
import { aituConfigured, exchangeCode, fetchUserInfo, verifyState } from "@/lib/gov/aitu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/aitu/callback — обмен кода на токен (server-side), линковка по телефону из
// claims, создание нашей сессии. ИИН не сохраняем (NFR-051).
export async function GET(req: Request) {
  const url = new URL(req.url);
  const store = await cookies();
  const stateHash = store.get("aitu_state")?.value;
  store.delete("aitu_state");

  const failRedirect = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, req.url));

  if (!aituConfigured()) return failRedirect("aitu_not_configured");
  if (!verifyState(stateHash, url.searchParams.get("state"))) return failRedirect("aitu_state");

  const code = url.searchParams.get("code");
  if (!code) return failRedirect("aitu_denied");

  try {
    const redirectUri = new URL("/api/auth/aitu/callback", req.url).toString();
    const tokens = await exchangeCode(code, redirectUri);
    const info = await fetchUserInfo(tokens.access_token);

    const phone = info.phone_number ? normalizeKzPhone(info.phone_number) : null;
    if (!phone) return failRedirect("aitu_no_phone");

    // Та же модель, что и OTP-вход: телефон — первичный идентификатор (REQ-001).
    await prisma.user.upsert({ where: { phone }, update: {}, create: { phone } });
    const user = await prisma.user.findUniqueOrThrow({
      where: { phone },
      include: { roles: true },
    });

    const { token, expiresAt } = await createSession(user.id, pickDefaultOsi(user.roles));
    await setSessionCookie(token, expiresAt);
    return NextResponse.redirect(new URL("/app", req.url));
  } catch (err) {
    console.error("[aitu] callback failed:", err instanceof Error ? err.message : err);
    return failRedirect("aitu_failed");
  }
}
