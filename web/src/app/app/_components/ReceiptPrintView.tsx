"use client";

import { Button } from "@/components/ui/button";
import type { ReceiptData } from "@/lib/payments/receiptService";
import { Building2,Printer } from "lucide-react";

export function ReceiptPrintView({ receipt }: { receipt: ReceiptData }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="grid gap-6">
      {/* Кнопки управления (скрываются при печати через print:hidden) */}
      <div className="flex items-center justify-between print:hidden">
        <p className="text-xs text-muted-foreground m-0">
          Квитанция сформирована за период: <strong className="text-foreground">{receipt.period}</strong>
        </p>
        <div className="flex gap-2">
          <Button onClick={handlePrint} className="gap-2 rounded-xl shadow-sm">
            <Printer size={16} /> Распечатать / Сохранить в PDF
          </Button>
        </div>
      </div>

      {/* Печатная форма квитанции (A4) */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm print:border-none print:shadow-none print:p-0 print:bg-transparent">
        {/* Шапка квитанции */}
        <div className="flex items-start justify-between border-b border-border pb-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground print:bg-black print:text-white">
              <Building2 size={24} />
            </div>
            <div>
              <h2 className="m-0 text-lg font-bold">{receipt.osi.name}</h2>
              <p className="m-0 text-xs text-muted-foreground">
                БИН: {receipt.osi.bin || "—"} · {receipt.osi.address || "Адрес не указан"}
              </p>
            </div>
          </div>
          <div className="text-right">
            <BadgePrint text="СЧЁТ-КВИТАНЦИЯ" />
            <p className="m-0 text-xs font-mono text-muted-foreground mt-1">
              Период: {receipt.period}
            </p>
          </div>
        </div>

        {/* Сведения о плательщике и объекте */}
        <div className="grid grid-cols-2 gap-4 rounded-xl bg-secondary/40 p-4 text-xs mb-6 print:bg-gray-100">
          <div>
            <p className="m-0 font-semibold text-muted-foreground uppercase text-[10px]">Плательщик</p>
            <p className="m-0 font-bold text-sm text-foreground mt-0.5">{receipt.apartment.residentName}</p>
            <p className="m-0 text-muted-foreground mt-1">Лицевой счёт: <strong>{receipt.apartment.accountNumber}</strong></p>
          </div>
          <div>
            <p className="m-0 font-semibold text-muted-foreground uppercase text-[10px]">Объект начисления</p>
            <p className="m-0 font-bold text-sm text-foreground mt-0.5">{receipt.building.address}, кв. {receipt.apartment.number}</p>
            {receipt.apartment.area && (
              <p className="m-0 text-muted-foreground mt-1">Площадь: {receipt.apartment.area} кв.м</p>
            )}
          </div>
        </div>

        {/* Детализация начислений */}
        <div className="mb-6">
          <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2">
            Начисления за текущий период
          </h4>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-secondary/60 font-semibold border-b border-border print:bg-gray-200">
                <tr>
                  <th className="p-3">Услуга / Статья расходов</th>
                  <th className="p-3 text-right">Сумма (₸)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {receipt.charges.map((charge, idx) => (
                  <tr key={idx}>
                    <td className="p-3 font-medium">{charge.title}</td>
                    <td className="p-3 text-right font-mono font-semibold">{charge.amount.toLocaleString("ru-RU")} ₸</td>
                  </tr>
                ))}
                {receipt.charges.length === 0 && (
                  <tr>
                    <td colSpan={2} className="p-4 text-center text-muted-foreground">
                      Начислений за текущий период нет
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Итоги к оплате */}
        <div className="flex items-center justify-between rounded-xl bg-primary/10 p-4 border border-primary/20 mb-6 print:border-black print:bg-gray-100">
          <div>
            <p className="m-0 text-xs font-semibold text-primary uppercase print:text-black">Всего к оплате</p>
            <p className="m-0 text-xs text-muted-foreground">Срок оплаты: до 25 числа месяца</p>
          </div>
          <div className="text-right">
            <span className="text-xl font-extrabold text-primary font-mono print:text-black">
              {receipt.totalDue.toLocaleString("ru-RU")} ₸
            </span>
          </div>
        </div>

        {/* Реквизиты для оплаты */}
        {(receipt.osi.ibanCurrent || receipt.osi.ibanSavings) && (
          <div className="rounded-xl border border-border/80 p-3 text-xs bg-card">
            <p className="m-0 font-bold mb-1">Банковские реквизиты для перечисления:</p>
            {receipt.osi.ibanCurrent && (
              <p className="m-0 text-muted-foreground">
                Текущий счёт (содержание): <strong className="font-mono text-foreground">{receipt.osi.ibanCurrent}</strong>
              </p>
            )}
            {receipt.osi.ibanSavings && (
              <p className="m-0 text-muted-foreground mt-0.5">
                Сберегательный счёт (капремонт): <strong className="font-mono text-foreground">{receipt.osi.ibanSavings}</strong>
              </p>
            )}
          </div>
        )}

        <div className="mt-6 text-center text-[10px] text-muted-foreground border-t border-border pt-3">
          Документ сформирован автоматически в системе ОСИ · Не требует мокрой печати
        </div>
      </div>
    </div>
  );
}

function BadgePrint({ text }: { text: string }) {
  return (
    <span className="inline-block rounded-md bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary print:bg-black print:text-white">
      {text}
    </span>
  );
}
