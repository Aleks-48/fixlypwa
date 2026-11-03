import { chairmanContext } from "@/lib/auth/context";
import { parseBankStatement } from "@/lib/bank-import/parser";
import { BankImportError,importedBankRefs,previewBankImport,transactionsSchema } from "@/lib/bank-import/service";
import { Errors } from "@/lib/http";
import { NextResponse } from "next/server";
import { z } from "zod";

export async function GET() {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  return NextResponse.json({ importedRefs: await importedBankRefs(ctx.osiId) });
}

export async function POST(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;
  try {
    let input: unknown;
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File) || file.size > 10 * 1024 * 1024) return Errors.validation("Выберите выписку размером до 10 МБ");
      if (!/\.(xlsx|xls|csv|txt)$/i.test(file.name)) return Errors.validation("Поддерживаются XLSX, XLS, CSV и TXT");
      input = { transactions: await parseBankStatement(Buffer.from(await file.arrayBuffer()), file.name), buildingId: form.get("buildingId") || undefined };
    } else input = await req.json();
    const parsed = z.object({ transactions: transactionsSchema, buildingId: z.string().uuid().optional() }).safeParse(input);
    if (!parsed.success) return Errors.validation("Проверьте номер, дату и положительную сумму до тиына (до 500 строк)");
    return NextResponse.json({ items: await previewBankImport(ctx.osiId, parsed.data.transactions, parsed.data.buildingId) });
  } catch (error) {
    if (error instanceof BankImportError || error instanceof RangeError) return Errors.validation(error.message);
    if (error instanceof SyntaxError || error instanceof TypeError) return Errors.validation("Некорректный файл или формат запроса");
    console.error("[bank-import] preview failed", error);
    return Errors.internal();
  }
}
