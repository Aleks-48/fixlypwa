import { chairmanContext } from "@/lib/auth/context";
import { Errors } from "@/lib/http";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  plan: z.enum(["standard", "vip", "max"]).default("standard"),
  apartments: z.coerce.number().min(1).default(50),
  months: z.coerce.number().min(1).max(12).default(1),
  useRef: z.coerce.boolean().default(false),
});

// GET /api/pricing/invoice?plan=standard&apartments=50&months=1
export async function GET(req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const url = new URL(req.url);
  const parsed = Query.safeParse(Object.fromEntries(url.searchParams.entries()));

  if (!parsed.success) {
    return Errors.validation("Некорректные параметры счета");
  }

  const { plan, apartments, months, useRef } = parsed.data;

  // Названия и базовые цены
  const planNames = {
    standard: "Тариф «Стандарт»",
    vip: "Тариф «VIP»",
    max: "Тариф «Максимальный»",
  };

  const basePrices = {
    standard: 120,
    vip: 140,
    max: 160,
  };

  const effectivePrice = plan === "standard" && useRef ? 50 : basePrices[plan];
  const totalAmount = effectivePrice * apartments * months;

  // Данные ОСИ
  const osi = await prisma.osi.findUnique({
    where: { id: ctx.osiId },
  });

  const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
  const dateStr = new Date().toLocaleDateString("ru-RU");

  // Генерация минимального HTML для печати/сохранения в PDF
  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>Счет на оплату ${invoiceNumber}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #6B7A47; padding-bottom: 20px; }
        .title { font-size: 24px; font-weight: bold; color: #6B7A47; }
        .details { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .box { background: #f9f9f9; padding: 15px; border-radius: 8px; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 30px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background: #6B7A47; color: white; }
        .total { text-align: right; margin-top: 20px; font-size: 18px; font-weight: bold; }
        .footer { margin-top: 50px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="title">СЧЕТ НА ОПЛАТУ № ${invoiceNumber}</div>
          <div>от ${dateStr} г.</div>
        </div>
        <div style="text-align: right;">
          <strong>Исполнитель:</strong> ТОО "Fixly OSI"<br>
          БИН: 230940012345<br>
          ИИК: KZ889261801154678901 в АО "Kaspi Bank"
        </div>
      </div>

      <div class="details">
        <div class="box">
          <strong>Заказчик / Заплательщик:</strong><br>
          ОСИ: ${osi?.name || "ОСИ / НСУ / УК"}<br>
          БИН/ИИН: ${osi?.bin || "Не указан"}<br>
          Адрес: ${osi?.address || "Казахстан"}
        </div>
        <div class="box">
          <strong>Основание:</strong><br>
          Договор публичной оферты Fixly<br>
          Назначение: Оплата за информационные услуги подписки
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>№</th>
            <th>Наименование услуги</th>
            <th>Кол-во кв.</th>
            <th>Период (мес)</th>
            <th>Цена (₸/кв)</th>
            <th>Сумма (₸)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>1</td>
            <td>Подписка на платформу Fixly (${planNames[plan]})</td>
            <td>${apartments}</td>
            <td>${months}</td>
            <td>${effectivePrice} ₸</td>
            <td>${totalAmount.toLocaleString("ru-RU")} ₸</td>
          </tr>
        </tbody>
      </table>

      <div class="total">Итого к оплате: ${totalAmount.toLocaleString("ru-RU")} KZT</div>

      <div class="footer">
        * Настоящий счет является официальным предложением (офертой) на оказание услуг.<br>
        Оплата счета означает полное и безоговорочное акцептование условий оферты.
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  return new Response(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
