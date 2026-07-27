import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { saveFcmToken, removeFcmToken } from "@/lib/notifications/fcm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ token: z.string().min(1) });

// POST /api/push/fcm-token — сохранить FCM-токен мобильного клиента (REQ-127, ADR-0012 §5).
// Достаточно входа (не memberContext): токен — identity, привязан к пользователю, не к ОСИ.
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректный токен");

  await saveFcmToken(auth.user.id, parsed.data.token);
  return ok({ saved: true }, { status: 201 });
}

// DELETE /api/push/fcm-token — удалить СВОЙ токен (выход/переустановка приложения).
// Удаление сужено по auth.user.id: чужой токен, даже если его строка известна, не отписывается.
export async function DELETE(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректный токен");

  await removeFcmToken(auth.user.id, parsed.data.token);
  return ok({ removed: true });
}
