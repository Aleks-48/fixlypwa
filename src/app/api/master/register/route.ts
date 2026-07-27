import { z } from "zod";
import { RequestCategory } from "@prisma/client";
import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { getMasterByUserId, registerMaster } from "@/lib/master/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  fullName: z.string().trim().min(2, "Укажите ФИО").max(120),
  city: z.string().trim().min(2, "Укажите город").max(80),
  categories: z.array(z.nativeEnum(RequestCategory)).min(1, "Выберите хотя бы одну категорию"),
  bio: z.string().trim().max(500).optional(),
});

// POST /api/master/register — анкета мастера (REQ-068). Требует вход (телефон+OTP, тот же
// флоу, что у жителя — verifyOtp создаёт User при первом входе). Один User — один Master.
export async function POST(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const existing = await getMasterByUserId(auth.user.id);
  if (existing) return Errors.validation("Анкета мастера уже подана");

  const master = await registerMaster(auth.user.id, parsed.data);
  return ok({ master: { id: master.id, status: master.status } }, { status: 201 });
}
