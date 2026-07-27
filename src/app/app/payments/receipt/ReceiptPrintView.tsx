'use client';

import type { ReceiptData } from "@/lib/payments/receiptService";

interface ReceiptPrintViewProps {
  data: ReceiptData;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  return new Intl.DateTimeFormat("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

export default function ReceiptPrintView({ data }: ReceiptPrintViewProps) {
  return (
    <>
      {/* Кнопка управления (скрывается при печати) */}
      <div className="no-print flex justify-end gap-3 p-4 bg-gray-50 border-b border-gray-200">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          🖨️ Распечатать / Сохранить в PDF
        </button>
      </div>

      {/* Печатный лист A4 */}
      <div className="receipt-page mx-auto my-6 w-[210mm] min-h-[297mm] bg-white p-[15mm] text-black shadow-lg print:shadow-none print:my-0 print:w-full print:min-h-0">
        <table className="w-full border-collapse text-[12px] leading-tight">
          <thead>
            <tr>
              <td colSpan={2} className="pb-4">
                <div className="flex items-start justify-between border-b-2 border-black pb-3">
                  <div>
                    <div className="text-base font-bold uppercase">
                      {data.osi.name || "Наименование ОСИ не указано"}
                    </div>
                    <div className="mt-1 text-[11px]">
                      БИН: {data.osi.bin || "—"}
                    </div>
                    <div className="text-[11px]">
                      IBAN: {data.osi.iban || "—"}
                    </div>
                    <div className="text-[11px]">
                      Адрес: {data.osi.address || "—"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">КВИТАНЦИЯ</div>
                    <div className="text-[11px]">
                      № {data.paymentId.slice(0, 8).toUpperCase()}
                    </div>
                    <div className="text-[11px]">
                      от {formatDate(data.issuedAt)}
                    </div>
                  </div>
                </div>
              </td>
            </tr>
          </thead>

          <tbody>
            <tr>
              <td colSpan={2} className="py-3">
                <table className="w-full border border-black text-[11px]">
                  <tbody>
                    <tr>
                      <td className="w-1/2 border border-black px-2 py-1 font-semibold bg-gray-50">
                        Плательщик
                      </td>
                      <td className="border border-black px-2 py-1">
                        {data.resident.fullName || "—"}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-semibold bg-gray-50">
                        Адрес объекта
                      </td>
                      <td className="border border-black px-2 py-1">
                        {data.apartment.buildingAddress}
                        {data.apartment.number
                          ? `, кв. ${data.apartment.number}`
                          : ""}
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-black px-2 py-1 font-semibold bg-gray-50">
                        Расчётный период
                      </td>
                      <td className="border border-black px-2 py-1">
                        {data.period || "—"}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td colSpan={2} className="pt-2 pb-1">
                <table className="w-full border border-black text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-black px-2 py-1 text-left bg-gray-100 w-10">
                        №
                      </th>
                      <th className="border border-black px-2 py-1 text-left bg-gray-100">
                        Статья начисления
                      </th>
                      <th className="border border-black px-2 py-1 text-right bg-gray-100 w-32">
                        Сумма, ₸
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lines.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="border border-black px-2 py-3 text-center text-gray-500"
                        >
                          Нет начислений
                        </td>
                      </tr>
                    ) : (
                      data.lines.map((line, index) => (
                        <tr key={line.code || index}>
                          <td className="border border-black px-2 py-1">
                            {index + 1}
                          </td>
                          <td className="border border-black px-2 py-1">
                            {line.label}
                          </td>
                          <td className="border border-black px-2 py-1 text-right">
                            {formatMoney(line.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                    <tr>
                      <td
                        colSpan={2}
                        className="border border-black px-2 py-2 text-right font-bold"
                      >
                        ИТОГО К ОПЛАТЕ
                      </td>
                      <td className="border border-black px-2 py-2 text-right font-bold">
                        {formatMoney(data.totalAmount)} ₸
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>

            <tr>
              <td colSpan={2} className="pt-8">
                <div className="flex justify-between text-[11px]">
                  <div>
                    Бухгалтер ОСИ ____________________ / ___________________
                  </div>
                  <div>М.П.</div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Безопасные стили для Next.js 15 */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @media print {
            @page {
              size: A4;
              margin: 0;
            }

            body {
              background: white !important;
              margin: 0 !important;
              padding: 0 !important;
            }

            .no-print {
              display: none !important;
            }

            nav,
            header,
            footer,
            [data-app-shell] {
              display: none !important;
            }

            .receipt-page {
              box-shadow: none !important;
              margin: 0 !important;
              width: 100% !important;
              min-height: auto !important;
              padding: 15mm !important;
            }
          }
        `,
        }}
      />
    </>
  );
}