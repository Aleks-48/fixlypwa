import { z } from "zod";
import { ok, Errors } from "@/lib/http";
import { chairmanContext } from "@/lib/auth/context";
import { listBankAccounts, upsertBankAccount } from "@/lib/finance/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  buildingId: z.string().uuid(),
  type: z.enum(["CURRENT", "SAVINGS"]),
  bankName: z.string().min(2),
  accountNumber: z.string().min(5), // IBAN
  currentBalance: z.number().min(0),
});

// GET/POST /api/bank-accounts — счета ОСИ и их остатки (REQ-026, блок 1–2 отчёта).
export async function GET(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const buildingId = new URL(req.url).searchParams.get("buildingId");
  if (!buildingId) return Errors.validation("Укажите buildingId");
  return ok({ bankAccounts: await listBankAccounts(ctx.osiId, buildingId) });
}

export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation(parsed.error.issues[0]?.message ?? "Некорректно");
  const account = await upsertBankAccount(ctx.osiId, parsed.data);
  return ok({ bankAccount: account }, { status: 201 });
}
