import { chairmanContext } from "@/lib/auth/context";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/reports/annual — генерирует отчет о деятельности ОСИ
export async function GET(_req: Request) {
  const ctx = await chairmanContext();
  if (!ctx.ok) return ctx.response;

  const osi = await prisma.osi.findUnique({
    where: { id: ctx.osiId },
  });

  const buildings = await prisma.building.findMany({
    where: { osiId: ctx.osiId },
    include: { apartments: true },
  });

  const totalApartments = buildings.reduce((acc, b) => acc + b.apartments.length, 0);

  // Собираем статические данные доходов/расходов (при наличии модулей финансов)
  const currentYear = new Date().getFullYear();
  const dateStr = new Date().toLocaleDateString("ru-RU");

  const html = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
      <meta charset="UTF-8">
      <title>ГОДОВОЙ ОТЧЕТ ОСИ за ${currentYear} г.</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 40px; color: #111; max-width: 800px; margin: 0 auto; line-height: 1.5; }
        .header { text-align: center; border-bottom: 2px solid #6B7A47; padding-bottom: 20px; margin-bottom: 30px; }
        .title { font-size: 24px; font-weight: bold; color: #6B7A47; text-transform: uppercase; }
        .subtitle { font-size: 14px; color: #555; margin-top: 5px; }
        .section { margin-top: 30px; }
        .section-title { font-size: 16px; font-weight: bold; color: #6B7A47; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 15px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .card { background: #f9f9f9; padding: 15px; border-radius: 8px; border: 1px solid #eee; }
        .card-val { font-size: 20px; font-weight: bold; color: #111; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { border: 1px solid #ddd; padding: 10px; text-align: left; font-size: 13px; }
        th { background: #f4f4f4; }
        .signatures { margin-top: 50px; display: flex; justify-content: space-between; font-size: 14px; }
        .sig-line { border-bottom: 1px solid #000; width: 200px; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="title">ГОДОВОЙ ОТЧЕТ ПРЕДСЕДАТЕЛЯ ОСИ</div>
        <div class="subtitle">о проделанной работе и исполнении сметы доходов и расходов за ${currentYear} год</div>
        <div style="margin-top: 10px; font-size: 13px; font-weight: bold;">ОСИ: "${osi?.name || "Название ОСИ"}"</div>
      </div>

      <div class="section">
        <div class="section-title">1. ОБЩИЕ СВЕДЕНИЯ ОБ ОБЪЕКТЕ УПРАВЛЕНИЯ</div>
        <div class="grid">
          <div class="card">
            <div>Количество домов во владении:</div>
            <div class="card-val">${buildings.length}</div>
          </div>
          <div class="card">
            <div>Общее количество квартир:</div>
            <div class="card-val">${totalApartments}</div>
          </div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">2. ФИНАНСОВЫЕ ПОКАЗАТЕЛИ И СМЕТА РАСХОДОВ</div>
        <table>
          <thead>
            <tr>
              <th>№</th>
              <th>Статья доходов / расходов</th>
              <th>Запланировано (₸)</th>
              <th>Фактически исполнено (₸)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>1</td>
              <td>Взносы жильцов на управление и содержание дома</td>
              <td>—</td>
              <td>По данным выписок</td>
            </tr>
            <tr>
              <td>2</td>
              <td>Текущий ремонт и обслуживание сетей</td>
              <td>—</td>
              <td>По актам работ</td>
            </tr>
            <tr>
              <td>3</td>
              <td>Уборка территории и вывоз мусора</td>
              <td>—</td>
              <td>По договорам</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="section">
        <div class="section-title">3. ОТЧЕТ ПО ЗАЯВКАМ И РЕМОНТНЫМ РАБОТАМ</div>
        <p style="font-size: 13px;">За текущий отчетный период все поступившие заявки от жильцов зарегистрированы в цифровой системе Fixly. Проведены плановые проверки инженерных сетей.</p>
      </div>

      <div class="signatures">
        <div>
          Председатель ОСИ:<br><br>
          <span class="sig-line"></span> (подпись)
        </div>
        <div>
          Дата составления:<br><br>
          <strong>${dateStr} г.</strong>
        </div>
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
