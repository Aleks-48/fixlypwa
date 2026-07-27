import { ok } from "@/lib/http";
import { destroyCurrentSession } from "@/lib/auth/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/auth/logout — завершить сессию (удалить из БД + снять cookie).
export async function POST() {
  await destroyCurrentSession();
  return ok({ ok: true });
}
