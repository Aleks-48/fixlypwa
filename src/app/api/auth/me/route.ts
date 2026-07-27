import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/auth/me — текущий пользователь, активная ОСИ и роли (для UI/навигации).
export async function GET() {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  return ok({
    user: publicUser(auth.user),
    activeOsiId: auth.session.activeOsiId,
    roles: auth.user.roles.map((r) => ({ osiId: r.osiId, role: r.role })),
  });
}
