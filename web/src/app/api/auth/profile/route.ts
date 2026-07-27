import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { getCurrentAuth } from "@/lib/auth/session";
import { publicUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ fullName: z.string().trim().min(2, "Укажите ФИО").max(200) });

// PATCH /api/auth/profile — редактирование ФИО аккаунта (onboarding-unified.md §0/REQ-146).
// Достаточно входа (не memberContext): ФИО — identity-уровень, не привязано к ОСИ/роли —
// доступно и role-less пользователю, ждущему привязки председателем.
export async function PATCH(req: Request) {
  const auth = await getCurrentAuth();
  if (!auth) return Errors.unauthorized();

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректные данные");
  }

  const user = await prisma.user.update({
    where: { id: auth.user.id },
    data: { fullName: parsed.data.fullName },
  });
  return ok({ user: publicUser(user) });
}
