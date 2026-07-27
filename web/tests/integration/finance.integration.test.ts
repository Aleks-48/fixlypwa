import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { forTenant } from "@/lib/db/tenant";
import { createOsiForUser, createBuilding, createApartment } from "@/lib/onboarding/service";
import {
  createTariff,
  generateCharges,
  addPayment,
  accountBalances,
  upsertBankAccount,
  createExpense,
} from "@/lib/finance/service";
import { generateReport, publishReport, getReport } from "@/lib/finance/report";
import type { ReportData } from "@/lib/finance/report";

// Финансовый движок Фазы 2: генерация начислений (PER_SQM), идемпотентность, статусы оплат,
// раздельные бакеты (REQ-024), цифры отчёта сходятся с исходными данными, AuditLog пишется.
const admin = new PrismaClient({
  datasourceUrl: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
});

const uniq = () => `+7781${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const PERIOD = new Date(Date.UTC(2026, 5, 1)); // июнь 2026
const TO = new Date(Date.UTC(2026, 6, 0, 23, 59, 59));

let osi = "";
let chair = "";
let buildingId = "";
let accountId = "";

beforeAll(async () => {
  const u = await admin.user.create({ data: { phone: uniq() } });
  chair = u.id;
  osi = (await createOsiForUser(chair, { name: `fin-${Date.now()}` })).id;
  buildingId = (await createBuilding(osi, { address: "fin-дом" })).id;
  await createApartment(osi, { buildingId, number: "1", area: 50 }); // 50 м²
  await createApartment(osi, { buildingId, number: "2", area: 100 }); // 100 м²
});

afterAll(async () => {
  await admin.$executeRawUnsafe(
    `DELETE FROM audit_log WHERE osi_id = '${osi}'`,
  );
  await admin.report.deleteMany({ where: { osiId: osi } });
  await admin.expense.deleteMany({ where: { osiId: osi } });
  await admin.counterparty.deleteMany({ where: { osiId: osi } });
  await admin.bankAccount.deleteMany({ where: { osiId: osi } });
  await admin.payment.deleteMany({ where: { osiId: osi } });
  await admin.charge.deleteMany({ where: { osiId: osi } });
  await admin.tariff.deleteMany({ where: { osiId: osi } });
  await admin.account.deleteMany({ where: { osiId: osi } });
  await admin.building.deleteMany({ where: { osiId: osi } });
  await admin.osi.delete({ where: { id: osi } });
  await admin.user.deleteMany({ where: { phone: { startsWith: "+7781" } } });
  await admin.$disconnect();
});

describe("Финансы Фазы 2 (REQ-020..031, 040/041)", () => {
  it("генерация начислений: PER_SQM × площадь, идемпотентно (REQ-021)", async () => {
    await createTariff(osi, chair, {
      buildingId,
      category: "MAINTENANCE",
      rateType: "PER_SQM",
      rate: 100, // 100 ₸/м²
      periodFrom: new Date(Date.UTC(2026, 0, 1)),
    });
    await createTariff(osi, chair, {
      buildingId,
      category: "CAPITAL_REPAIR",
      rateType: "FIXED",
      rate: 2000,
      periodFrom: new Date(Date.UTC(2026, 0, 1)),
    });

    const first = await generateCharges(osi, chair, buildingId, PERIOD);
    expect(first.created).toBe(4); // 2 квартиры × 2 тарифа

    // Повтор — ничего не дублирует.
    const second = await generateCharges(osi, chair, buildingId, PERIOD);
    expect(second.created).toBe(0);
    expect(second.skipped).toBe(4);

    // Кв.1 (50 м²): 100×50=5000 MAINTENANCE + 2000 кап.ремонт.
    const acc = await forTenant(osi, (tx) =>
      tx.account.findFirstOrThrow({ where: { apartment: { number: "1", buildingId } } }),
    );
    accountId = acc.id;
    const b = await forTenant(osi, (tx) => accountBalances(tx, acc.id));
    expect(b.MAINTENANCE.charged).toBe(5000);
    expect(b.CAPITAL_REPAIR.charged).toBe(2000);
  });

  it("платёж: частичная оплата → PARTIALLY_PAID; бакеты раздельны (REQ-023/024)", async () => {
    // Платим 3000 из 5000 по содержанию.
    await addPayment(osi, chair, {
      accountId,
      amount: 3000,
      paidAt: new Date(Date.UTC(2026, 5, 15)),
      incomeCategory: "RESIDENT_DUES",
    });
    const b = await forTenant(osi, (tx) => accountBalances(tx, accountId));
    expect(b.MAINTENANCE.debt).toBe(2000);
    // Переплата содержания НЕ гасит кап.ремонт (REQ-024): его долг не тронут.
    expect(b.CAPITAL_REPAIR.debt).toBe(2000);

    const charge = await forTenant(osi, (tx) =>
      tx.charge.findFirstOrThrow({
        where: { accountId, tariff: { category: "MAINTENANCE" } },
      }),
    );
    expect(charge.status).toBe("PARTIALLY_PAID");

    // Доплата 2000 → PAID.
    await addPayment(osi, chair, {
      accountId,
      amount: 2000,
      paidAt: new Date(Date.UTC(2026, 5, 20)),
      incomeCategory: "RESIDENT_DUES",
    });
    const paidCharge = await forTenant(osi, (tx) =>
      tx.charge.findFirstOrThrow({
        where: { accountId, tariff: { category: "MAINTENANCE" } },
      }),
    );
    expect(paidCharge.status).toBe("PAID");
  });

  it("отчёт: 4 блока сходятся с данными; публичный вид скрывает физлиц (§2а)", async () => {
    await upsertBankAccount(osi, {
      buildingId,
      type: "CURRENT",
      bankName: "Kaspi",
      accountNumber: "KZ123456789",
      currentBalance: 150000,
    });
    const bank = await forTenant(osi, (tx) => tx.bankAccount.findFirstOrThrow({ where: { buildingId } }));
    await createExpense(osi, chair, {
      buildingId,
      bankAccountId: bank.id,
      expenseCategory: "SERVICE_CONTRACT",
      date: new Date(Date.UTC(2026, 5, 10)),
      amount: 40000,
      purpose: "ТО лифта",
      counterpartyName: "ТОО ЛифтСервис",
      counterpartyBin: "123456789012",
      counterpartyType: "ТОО",
    });
    await createExpense(osi, chair, {
      buildingId,
      bankAccountId: bank.id,
      expenseCategory: "LABOR_MANAGEMENT",
      date: new Date(Date.UTC(2026, 5, 12)),
      amount: 80000,
      purpose: "оплата по ДГП Иванову И.И.",
      counterpartyName: "Иванов Иван",
      counterpartyType: "физлицо",
    });

    const rep = await generateReport(osi, buildingId, PERIOD, TO);
    const data = rep.data as unknown as ReportData;

    expect(data.balances.current).toBe(150000);
    expect(data.income.RESIDENT_DUES).toBe(5000); // 3000+2000
    expect(data.income.total).toBe(5000);
    // Долги на конец периода: кв.1 кап.ремонт 2000 + кв.2 (10000+2000 не оплачено).
    expect(data.debt.maintenance).toBe(10000);
    expect(data.debt.capitalRepair).toBe(4000);
    expect(data.expenses.total).toBe(120000);
    expect(data.expenses.byCategory.SERVICE_CONTRACT).toBe(40000);

    // До публикации житель отчёт не видит.
    expect(await getReport(osi, rep.id, true)).toBeNull();
    await publishReport(osi, rep.id);

    const pub = await getReport(osi, rep.id, true);
    expect(pub).not.toBeNull();
    const rows = (pub!.data as ReportData).expenses.rows;
    expect(rows.find((r) => r.counterparty?.name === "ТОО ЛифтСервис")).toBeTruthy(); // юрлицо видно
    expect(rows.find((r) => r.counterparty?.name.includes("Иванов"))).toBeUndefined(); // физлицо скрыто
    expect(rows.find((r) => r.counterparty?.name === "ФОТ персонала (ДГП)")).toBeTruthy();
  });

  it("AuditLog: мутации журналируются (REQ-090)", async () => {
    const count = await forTenant(osi, (tx) => tx.auditLog.count());
    // 2 тарифа + 4 начисления + 2 платежа + 2 расхода = 10 записей.
    expect(count).toBe(10);
  });
});
