import "server-only";
import { ExpenseCategory, IncomeCategory, Prisma } from "@prisma/client";
import { z } from "zod";
import { forTenant } from "@/lib/db/tenant";

export const transactionSchema = z.object({
  bankRef: z.string().trim().min(1).max(200),
  date: z.coerce.date(),
  amount: z.number().finite().positive().max(9_999_999_999.99).multipleOf(0.01),
  type: z.enum(["INCOME", "EXPENSE"]),
  purpose: z.string().max(4000).default(""),
  counterpartyName: z.string().max(500).default(""),
  counterpartyIinBin: z.string().max(20).optional(),
  detectedApartmentNumber: z.string().max(30).optional(),
  matchedAccountId: z.string().uuid().optional(),
  buildingId: z.string().uuid().optional(),
  bankAccountId: z.string().uuid().optional(),
  incomeCategory: z.nativeEnum(IncomeCategory).optional(),
  expenseCategory: z.nativeEnum(ExpenseCategory).optional(),
});
export const transactionsSchema = z.array(transactionSchema).min(1).max(500);
export type ImportTransaction = z.infer<typeof transactionSchema>;
export class BankImportError extends Error {}

async function refs(tx: Prisma.TransactionClient) {
  const payments = await tx.payment.findMany({ where: { bankRef: { not: null } }, select: { bankRef: true } });
  const expenses = await tx.expense.findMany({ where: { bankRef: { not: null } }, select: { bankRef: true } });
  return new Set([...payments, ...expenses].flatMap((row) => row.bankRef ? [row.bankRef] : []));
}

export function importedBankRefs(osiId: string) {
  return forTenant(osiId, async (tx) => [...await refs(tx)]);
}

export function previewBankImport(osiId: string, items: ImportTransaction[], buildingId?: string) {
  return forTenant(osiId, async (tx) => {
    if (buildingId && !await tx.building.findUnique({ where: { id: buildingId } })) throw new BankImportError("Дом недоступен");
    const existingRefs = await refs(tx);
    const apartments = await tx.apartment.findMany({
      where: buildingId ? { buildingId } : {},
      include: { account: true, owners: true, occupants: true },
    });
    return items.map((item) => {
      const isDuplicate = existingRefs.has(item.bankRef);
      existingRefs.add(item.bankRef);
      const candidates = item.type === "INCOME" ? apartments.filter((apt) => {
        if (buildingId && item.detectedApartmentNumber) return apt.number === item.detectedApartmentNumber;
        if (item.counterpartyIinBin) return apt.owners.some((owner) => owner.iin === item.counterpartyIinBin);
        const name = item.counterpartyName.trim().toLocaleLowerCase();
        return name.length > 2 && [...apt.owners, ...apt.occupants].some((person) => person.fullName.trim().toLocaleLowerCase() === name);
      }) : [];
      const match = candidates.length === 1 ? candidates[0] : undefined;
      return { ...item, matchedAccountId: match?.account?.id, matchedApartmentNumber: match?.number,
        buildingId, isDuplicate, status: isDuplicate ? "DUPLICATE" : match?.account ? "MATCHED" : "NEED_ATTENTION" };
    });
  });
}

export function commitBankImport(osiId: string, actorUserId: string, input: ImportTransaction[]) {
  const items = transactionsSchema.parse(input);
  return forTenant(osiId, async (tx) => {
    // Serialize imports for one OSI, including concurrent duplicate requests.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${osiId}, 0))::text`;
    const existingRefs = await refs(tx);
    let paymentsCreated = 0, expensesCreated = 0, skippedDuplicates = 0, skippedUnmatched = 0;
    for (const item of items) {
      if (existingRefs.has(item.bankRef)) { skippedDuplicates++; continue; }
      let entityId: string;
      if (item.type === "INCOME") {
        if (!item.matchedAccountId) { skippedUnmatched++; continue; }
        const account = await tx.account.findUnique({ where: { id: item.matchedAccountId }, include: { apartment: true } });
        if (!account || (item.buildingId && account.apartment.buildingId !== item.buildingId)) throw new BankImportError("Лицевой счёт недоступен или не относится к дому");
        const payment = await tx.payment.create({ data: { osiId, accountId: account.id, amount: item.amount, paidAt: item.date,
          method: "Банковская выписка", bankRef: item.bankRef, incomeCategory: item.incomeCategory ?? "RESIDENT_DUES" } });
        entityId = payment.id;
        paymentsCreated++;
      } else {
        if (!item.buildingId || !item.bankAccountId) { skippedUnmatched++; continue; }
        const bank = await tx.bankAccount.findUnique({ where: { id: item.bankAccountId } });
        if (!bank || bank.buildingId !== item.buildingId) throw new BankImportError("Банковский счёт недоступен или не относится к дому");
        const expense = await tx.expense.create({ data: { osiId, buildingId: item.buildingId, bankAccountId: bank.id,
          expenseCategory: item.expenseCategory ?? "HOUSEHOLD", date: item.date, amount: item.amount, purpose: item.purpose, bankRef: item.bankRef } });
        entityId = expense.id;
        expensesCreated++;
      }
      await tx.auditLog.create({ data: { osiId, actorUserId, entityId, entityType: item.type === "INCOME" ? "PAYMENT" : "EXPENSE",
        action: "CREATE", diff: { source: "bank-import", bankRef: item.bankRef, amount: item.amount } } });
      existingRefs.add(item.bankRef);
    }
    return { success: true, paymentsCreated, expensesCreated, skippedDuplicates, skippedUnmatched };
  });
}
