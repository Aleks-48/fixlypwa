"use client";
import type { ReceiptData } from "@/lib/payments/receiptService";
const money = (value: number) => value.toLocaleString("ru-RU", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " ₸";
export default function ReceiptPrintView({ data }: { data: ReceiptData }) {
  return <main className="mx-auto max-w-3xl space-y-5 bg-white p-8 text-black">
    <h1 className="text-2xl font-bold">Квитанция за {data.period}</h1>
    <p>{data.osi.name} · БИН {data.osi.bin ?? "не указан"}</p>
    <p>{data.building.address}, кв. {data.apartment.number}<br />{data.apartment.residentName}<br />Лицевой счёт: {data.apartment.accountNumber}</p>
    <table className="w-full border-collapse text-left"><thead><tr><th className="border p-2">Начисление</th><th className="border p-2">Сумма</th></tr></thead>
      <tbody>{data.charges.map((item,i)=><tr key={i}><td className="border p-2">{item.title}</td><td className="border p-2">{money(item.amount)}</td></tr>)}</tbody></table>
    <p>Сальдо на начало месяца: {money(data.previousBalance)}<br />Начислено за месяц: {money(data.totalCharged)}<br />Оплачено за месяц: {money(data.paidInPeriod)}</p>
    <p className="text-xl font-bold">К оплате: {money(data.totalDue)}</p>
    {data.balances.map(balance=><p key={balance.title}>{balance.title}: долг {money(balance.debt)}{balance.credit > 0 ? ", переплата " + money(balance.credit) : ""}</p>)}
    <p className="text-sm">Переплата по одному назначению не погашает долг по другому назначению.</p>
    <p>Текущий счёт: {data.osi.ibanCurrent ?? "не указан"}<br />Сберегательный счёт: {data.osi.ibanSavings ?? "не указан"}</p>
    <button className="rounded bg-blue-700 px-4 py-2 text-white print:hidden" onClick={()=>window.print()}>Печать / сохранить PDF</button>
  </main>;
}
