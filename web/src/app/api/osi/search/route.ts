import { getCurrentAuth } from "@/lib/auth/session";
import { ok, Errors } from "@/lib/http";
import { searchOsi } from "@/lib/onboarding/joinRequest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/osi/search?q=... — найти ОСИ по названию/адресу (REQ-151). Любой вошедший
// пользователь, без требования tenant-контекста — это и есть сценарий «ещё не в ОСИ».
export async function GET(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const q = new URL(req.url).searchParams.get("q") ?? "";
  const results = await searchOsi(q);
  return ok({ results });
}
