import { chairmanContext } from "@/lib/auth/context";
import { BankImportError,commitBankImport,transactionsSchema } from "@/lib/bank-import/service";
import { Errors } from "@/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  const parsed = z.object({ items: transactionsSchema }).safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Errors.validation("Некорректные строки выписки (до 500 строк)");
  try {
    return NextResponse.json(await commitBankImport(ctx.osiId, ctx.auth.user.id, parsed.data.items));
  } catch (error) {
    if (error instanceof BankImportError) return Errors.validation(error.message);
    console.error("[bank-import] commit failed", error);
    return Errors.internal();
  }
}
