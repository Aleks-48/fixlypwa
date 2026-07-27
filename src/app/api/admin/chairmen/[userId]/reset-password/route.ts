import { ok, fail, Errors } from "@/lib/http";
import { adminContext } from "@/lib/auth/context";
import { resetChairmanPassword } from "@/lib/admin/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/admin/chairmen/[userId]/reset-password — новый временный пароль + отзыв всех
// сессий пользователя (REQ-112). Пароль показывается один раз, в аудит не пишется.
export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;

  const { userId } = await params;
  const result = await resetChairmanPassword(ctx.auth.user.id, userId);
  if (!result.ok) {
    if (result.error === "USER_NOT_FOUND") return Errors.validation("Пользователь не найден");
    return fail("NO_EMAIL", "У пользователя нет email — вход по паролю невозможен", 400);
  }

  return ok({ tempPassword: result.tempPassword });
}
