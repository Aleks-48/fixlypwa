import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { addPayment } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  accountId: z.string().uuid(),
  amount: z.number().positive(),
  paidAt: z.coerce.date(),
  // Статья — ОБЯЗАТЕЛЬНА (REQ-024, Q-032: без авто-распределения).
  incomeCategory: z.enum([
    "RESIDENT_DUES",
    "PARKING_STORAGE_DUES",
    "CAPITAL_REPAIR_CONTRIBUTION",
    "RENTAL_INCOME",
    "TARGETED_RESIDENT",
    "TARGETED_PARKING",
    "OTHER_INCOME",
  ]),
});

// POST /api/payments — ручной ввод платежа (REQ-030); пересчитывает статусы начислений бакета.
export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");
  const payment = await addPayment(ctx.osiId, ctx.auth.user.id, parsed.data);
  if (!payment) return Errors.notFound("Лицевой счёт");
  return ok({ payment: { id: payment.id } }, { status: 201 });
}
