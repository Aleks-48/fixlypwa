import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { getCurrentAuth, setActiveOsi } from "@/lib/auth/session";
import { roleFor } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ osiId: z.string().uuid() });

// POST /api/auth/switch-osi — сменить активную ОСИ (REQ-004). Разрешено только если у
// пользователя есть роль в этой ОСИ (проверка на сервере, REQ-003).
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Укажите osiId");

  if (roleFor(auth, parsed.data.osiId) === null) {
    return Errors.forbidden();
  }

  await setActiveOsi(auth.session.id, parsed.data.osiId);
  return ok({ activeOsiId: parsed.data.osiId });
}
