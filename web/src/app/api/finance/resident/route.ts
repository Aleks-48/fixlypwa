import { ok } from "@/lib/http";
import { memberContext } from "@/lib/auth/context";
import { listResidentCharges, listResidentPayments, residentBalances } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/finance/resident — баланс/начисления/платежи текущего жителя (мобильный клиент,
// срез 22, read-only). Та же тройка вызовов, что у веб-страницы /app/payments
// (src/app/app/payments/page.tsx) — эндпоинт существует только для клиентов без Server
// Components. Демо-оплата (ADR-0010) — отдельный роут /api/payments/checkout, срез 23.
export async function GET() {
  const ctx = await memberContext();
  if (!ctx.ok) return ctx.response;

  const [balances, charges, payments] = await Promise.all([
    residentBalances(ctx.osiId, ctx.auth.user.id),
    listResidentCharges(ctx.osiId, ctx.auth.user.id),
    listResidentPayments(ctx.osiId, ctx.auth.user.id),
  ]);

  return ok({ balances, charges, payments });
}
