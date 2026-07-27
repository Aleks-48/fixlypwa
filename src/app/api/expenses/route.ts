import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { listExpenses, createExpense } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  bankAccountId: z.string().uuid(),
  expenseCategory: z.enum([
    "LABOR_ACCOUNTING",
    "LABOR_MANAGEMENT",
    "BUDGET_PAYMENTS",
    "BANK_SERVICES",
    "CASH_SERVICE",
    "OFFICE",
    "SERVICE_CONTRACT",
    "CURRENT_REPAIR",
    "UTILITIES",
    "HOUSEHOLD",
    "CAPITAL_REPAIR",
  ]),
  date: z.coerce.date(),
  amount: z.number().positive(),
  purpose: z.string().max(300).optional(),
  counterpartyName: z.string().max(200).optional(),
  counterpartyBin: z.string().regex(/^\d{12}$/).optional(),
  counterpartyType: z.enum(["ИП", "ТОО", "НАО", "физлицо"]).optional(),
  isInternalTransfer: z.boolean().optional(),
});

// GET/POST /api/expenses — реестр расходов (REQ-025, блок 7 отчёта).
export async function GET(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const buildingId = new URL(req.url).searchParams.get("buildingId");
  if (!buildingId) return Errors.validation("Укажите buildingId");
  return ok({ expenses: await listExpenses(ctx.osiId, buildingId) });
}

export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");
  const expense = await createExpense(ctx.osiId, ctx.auth.user.id, parsed.data);
  return ok({ expense: { id: expense.id } }, { status: 201 });
}
