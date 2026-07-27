import { z } from "zod";
import { ok, fail, Errors } from "@/lib/http";
import { adminContext } from "@/lib/auth/context";
import { grantChairman } from "@/lib/admin/service";
import { normalizeKzPhone } from "@/lib/phone";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  osiId: z.string().uuid(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
});

// POST /api/admin/chairmen — привязать/создать председателя ОСИ (REQ-112, провижининг после
// продажи — дополнение к self-service Q-051). Временный пароль возвращается ОДИН РАЗ,
// в аудит/логи не пишется (admin-panel.md §4).
export async function POST(req: Request) {
  const ctx = await adminContext();
  if (!ctx.ok) return ctx.response;

  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) return Errors.validation("Укажите ОСИ и телефон (email — опционально)");

  const phone = normalizeKzPhone(parsed.data.phone);
  if (!phone) return Errors.validation("Некорректный номер телефона");

  const result = await grantChairman(ctx.auth.user.id, {
    osiId: parsed.data.osiId,
    phone,
    email: parsed.data.email,
  });
  if (!result.ok) {
    if (result.error === "OSI_NOT_FOUND") return Errors.validation("ОСИ не найдена");
    return fail("EMAIL_TAKEN", "Этот email уже занят другим пользователем", 409);
  }

  return ok(
    { userId: result.userId, created: result.created, tempPassword: result.tempPassword },
    { status: result.created ? 201 : 200 },
  );
}
