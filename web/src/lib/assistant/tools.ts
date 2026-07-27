import type { TariffCategory } from "@prisma/client";
import {
  residentBalances,
  listResidentCharges,
  listResidentPayments,
  buildingAccounts,
} from "@/lib/finance/service";
import { listAnnouncements, listRequests } from "@/lib/comms/service";
import type { ToolDef } from "./types";
import { scrubToolResultText } from "./pseudonymizer";

// Инструменты read-only поверх СУЩЕСТВУЮЩИХ сервисов (docs/specs/ai-assistant.md §2/§5) — каждый
// вызывает forTenant-обёрнутую функцию с osiId/userId ТЕКУЩЕЙ сессии, поэтому ассистент физически
// не может прочитать чужой тенант и не имеет собственных прав сверх пользователя, который спрашивает.
//
// buildingId НЕ параметр модели: разрешается на сервере (service.ts) из сессии, а не запросом
// LLM — иначе модель могла бы (по ошибке или из-за prompt injection в чужом tool-результате)
// запросить чужой дом внутри той же ОСИ. Упрощение MVP: председатель с несколькими домами видит
// только первый (см. docs/specs/ai-assistant.md §12).

export type ToolContext = {
  osiId: string;
  userId: string;
  buildingId: string | null;
};

type ToolExecutor = (ctx: ToolContext) => Promise<unknown>;
type Tool = { def: ToolDef; run: ToolExecutor };

const EMPTY_PARAMS: ToolDef["parameters"] = { type: "object", properties: {} };

const BUCKET_LABEL: Record<TariffCategory, string> = {
  MAINTENANCE: "Эксплуатация",
  TARGETED: "Целевой сбор",
  CAPITAL_REPAIR: "Капитальный ремонт",
};

function scrub<T>(value: T): T {
  return typeof value === "string" ? (scrubToolResultText(value) as unknown as T) : value;
}

// ================= Инструменты жителя =================

const getMyBalance: Tool = {
  def: {
    name: "get_my_balance",
    description:
      "Текущий баланс жителя (начислено/оплачено/долг) по трём статьям: эксплуатация, целевой сбор, капремонт.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    const balances = await residentBalances(ctx.osiId, ctx.userId);
    if (!balances) return { error: "У вас нет привязанной квартиры/лицевого счёта." };
    return Object.fromEntries(
      (Object.entries(balances) as [TariffCategory, (typeof balances)[TariffCategory]][]).map(
        ([bucket, b]) => [BUCKET_LABEL[bucket], b],
      ),
    );
  },
};

const listMyCharges: Tool = {
  def: {
    name: "list_my_charges",
    description:
      "Последние начисления жителя (до 12 периодов): период, сумма, статья, статус оплаты.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    const charges = await listResidentCharges(ctx.osiId, ctx.userId);
    return charges.map((c) => ({
      period: c.period.toISOString().slice(0, 7),
      amount: Number(c.amount),
      category: BUCKET_LABEL[c.tariff.category],
      status: c.status,
      dueDate: c.dueDate.toISOString().slice(0, 10),
    }));
  },
};

const listMyPayments: Tool = {
  def: {
    name: "list_my_payments",
    description: "История платежей жителя (до 12 последних): дата, сумма, способ оплаты.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    const payments = await listResidentPayments(ctx.osiId, ctx.userId);
    return payments.map((p) => ({
      paidAt: p.paidAt.toISOString().slice(0, 10),
      amount: Number(p.amount),
      method: p.method,
    }));
  },
};

const listMyRequests: Tool = {
  def: {
    name: "list_my_requests",
    description:
      "Заявки жителя (обращения по дому/квартире) со статусами: получена/в работе/решена.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    const requests = await listRequests(ctx.osiId, { authorUserId: ctx.userId });
    return requests.map((r) => ({
      category: r.category,
      status: r.status,
      text: scrub(r.text),
      createdAt: r.createdAt.toISOString().slice(0, 10),
      messagesCount: r.messages.length,
    }));
  },
};

const listAnnouncementsTool: Tool = {
  def: {
    name: "list_announcements",
    description:
      "Объявления дома: заголовок, текст, дата, закреплено ли, прочитано ли текущим пользователем.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    if (!ctx.buildingId) return { error: "Дом не определён." };
    const items = await listAnnouncements(ctx.osiId, ctx.buildingId, ctx.userId);
    return items.slice(0, 15).map((a) => ({
      title: scrub(a.title),
      body: scrub(a.body),
      isPinned: a.isPinned,
      createdAt: a.createdAt.toISOString().slice(0, 10),
      readByViewer: a.readByViewer,
    }));
  },
};

// ================= Инструменты председателя =================
// §5/§6: без ФИО жителей — только номер квартиры и суммы (номер квартиры не идентифицирует
// физлицо без ФИО, это адрес объекта, а не ПДн).

const getFinanceSummary: Tool = {
  def: {
    name: "get_finance_summary",
    description:
      "Финансовая сводка дома: суммарно начислено/оплачено/долг по трём статьям (эксплуатация, целевой сбор, капремонт) по всем квартирам.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    if (!ctx.buildingId) return { error: "Дом не определён." };
    const rows = await buildingAccounts(ctx.osiId, ctx.buildingId);
    const buckets: TariffCategory[] = ["MAINTENANCE", "TARGETED", "CAPITAL_REPAIR"];
    const totals = Object.fromEntries(
      buckets.map((b) => [BUCKET_LABEL[b], { charged: 0, paid: 0, debt: 0 }]),
    ) as Record<string, { charged: number; paid: number; debt: number }>;
    for (const row of rows) {
      if (!row.balances) continue;
      for (const bucket of buckets) {
        const label = BUCKET_LABEL[bucket];
        totals[label]!.charged += row.balances[bucket].charged;
        totals[label]!.paid += row.balances[bucket].paid;
        totals[label]!.debt += row.balances[bucket].debt;
      }
    }
    return { apartmentsCount: rows.length, totals };
  },
};

const listDebtors: Tool = {
  def: {
    name: "list_debtors",
    description:
      "Список квартир с задолженностью (номер квартиры и сумма долга по статьям) — БЕЗ имён жителей.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    if (!ctx.buildingId) return { error: "Дом не определён." };
    const rows = await buildingAccounts(ctx.osiId, ctx.buildingId);
    return rows
      .filter((r) => r.balances && Object.values(r.balances).some((b) => b.debt > 0))
      .map((r) => ({
        apartmentNumber: r.number,
        debtByCategory: Object.fromEntries(
          (Object.entries(r.balances!) as [TariffCategory, { debt: number }][])
            .filter(([, b]) => b.debt > 0)
            .map(([bucket, b]) => [BUCKET_LABEL[bucket], b.debt]),
        ),
      }));
  },
};

const listOpenRequests: Tool = {
  def: {
    name: "list_open_requests",
    description: "Открытые заявки дома (не решённые): категория, статус, дата, текст обращения.",
    parameters: EMPTY_PARAMS,
  },
  run: async (ctx) => {
    if (!ctx.buildingId) return { error: "Дом не определён." };
    const requests = await listRequests(ctx.osiId, { buildingId: ctx.buildingId });
    return requests
      .filter((r) => r.status !== "RESOLVED")
      .slice(0, 20)
      .map((r) => ({
        category: r.category,
        status: r.status,
        text: scrub(r.text),
        createdAt: r.createdAt.toISOString().slice(0, 10),
      }));
  },
};

const RESIDENT_TOOLS: Tool[] = [
  getMyBalance,
  listMyCharges,
  listMyPayments,
  listMyRequests,
  listAnnouncementsTool,
];

const CHAIRMAN_TOOLS: Tool[] = [
  getFinanceSummary,
  listDebtors,
  listOpenRequests,
  listAnnouncementsTool,
];

export function toolsForRole(role: "resident" | "chairman"): Tool[] {
  return role === "chairman" ? CHAIRMAN_TOOLS : RESIDENT_TOOLS;
}

export function toolDefsForRole(role: "resident" | "chairman"): ToolDef[] {
  return toolsForRole(role).map((t) => t.def);
}

export async function runTool(
  role: "resident" | "chairman",
  name: string,
  ctx: ToolContext,
): Promise<unknown> {
  const tool = toolsForRole(role).find((t) => t.def.name === name);
  if (!tool) return { error: `Неизвестный инструмент: ${name}` };
  try {
    return await tool.run(ctx);
  } catch (err) {
    console.error(`[assistant/tools] ${name} упал:`, err);
    return { error: "Не удалось получить данные — попробуйте переформулировать вопрос." };
  }
}
