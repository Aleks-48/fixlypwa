import { z } from "zod";
import { ok, Errors, fail } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { payOnlineDemo } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  method: z.enum(["test_card", "test_qr"]),
  // Сумма, которую жителю показали при открытии шторки — только для сверки (REQ-036):
  // сервер всё равно пересчитывает долг сам, клиентское значение не участвует в списании.
  expectedAmount: z.number().positive().optional(),
});

// POST /api/payments/checkout — онлайн-оплата текущего долга жителем через симулятор
// эквайринга (демо-режим, payments-online.md, ADR-0010). Сумма — весь долг жителя,
// пересчитанный на сервере; клиент только выбирает способ (косметика).
export async function POST(req: Request) {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Укажите способ оплаты");

  const result = await payOnlineDemo(
    ctx.osiId,
    ctx.auth.user.id,
    parsed.data.method,
    parsed.data.expectedAmount,
  );

  if (!result.success) {
    if (result.reason === "no_account") return Errors.notFound("Лицевой счёт");
    if (result.reason === "amount_changed") {
      return fail(
        "AMOUNT_CHANGED",
        `Сумма долга изменилась: сейчас ₸ ${result.currentAmount.toLocaleString("ru-RU")}. Обновите страницу и попробуйте снова.`,
        409,
      );
    }
    return fail("INSUFFICIENT_FUNDS", "Недостаточно средств (демо-режим) — попробуйте ещё раз", 402);
  }
  if (result.alreadyPaid) return ok({ success: true, alreadyPaid: true });
  return ok({ success: true, alreadyPaid: false, gatewayRef: result.gatewayRef, amount: result.amount });
}
