import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { fail } from "@/lib/http";
import { aituConfigured, buildAuthorizeUrl, generateState, hashState } from "@/lib/gov/aitu";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/aitu/start — начало OAuth-входа через Aitu Passport (Digital ID).
// State (CSRF) — hash в HttpOnly-cookie, сверяется в callback.
export async function GET(req: Request) {
  if (!aituConfigured()) {
    return fail("NOT_CONFIGURED", "Вход через Aitu не подключён (нужны партнёрские ключи BTS Digital)", 503);
  }
  const state = generateState();
  const redirectUri = new URL("/api/auth/aitu/callback", req.url).toString();

  (await cookies()).set("aitu_state", hashState(state), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 600,
    path: "/",
  });
  return NextResponse.redirect(buildAuthorizeUrl(redirectUri, state));
}
