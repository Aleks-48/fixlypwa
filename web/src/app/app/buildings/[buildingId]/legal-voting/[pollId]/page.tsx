import { prisma } from "@/lib/prisma";
import { getCurrentAuth } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import { PrintProtocolButton } from "./print-button";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function PollDetailPage({
  params,
}: {
  params: Promise<{ buildingId: string; pollId: string }>;
}) {
  const { buildingId, pollId } = await params;

  // 1. Авторизация
  const auth = await getCurrentAuth().catch(() => null);
  if (!auth) redirect("/login");

  // 2. Данные дома
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: { address: true, city: true, apartmentsCount: true },
  });

  // 3. Данные голосования и вариантов
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    include: {
      options: {
        include: {
          _count: { select: { votes: true } },
        },
      },
    },
  });

  if (!poll || poll.buildingId !== buildingId) {
    notFound();
  }

  const pAny = poll as any;
  const totalApartments = building?.apartmentsCount && building.apartmentsCount > 0 ? building.apartmentsCount : 1;

  // Подсчет голосов
  const totalVotesCount = poll.options.reduce(
    (sum, opt) => sum + (opt._count?.votes ?? 0),
    0
  );
  const votedPercent = Math.min(100, Math.round((totalVotesCount / totalApartments) * 100));
  const requiredQuorum = Number(pAny.quorumThreshold) || 50;
  const isQuorumReached = votedPercent >= requiredQuorum;

  // Форматирование дат
  const startDateStr = pAny.startDate
    ? new Date(pAny.startDate).toLocaleDateString("ru-RU")
    : new Date(poll.createdAt).toLocaleDateString("ru-RU");

  const endDateStr = pAny.endDate
    ? new Date(pAny.endDate).toLocaleDateString("ru-RU")
    : pAny.deadline
    ? new Date(pAny.deadline).toLocaleDateString("ru-RU")
    : "В процессе";

  // Чтение текста вариантов ответа с фоллбэком по возможным названиям колонок в DB
  const optionsResult = poll.options.map((opt) => {
    const pOpt = opt as any;
    const votes = opt._count?.votes ?? 0;
    const percent = totalVotesCount > 0 ? Math.round((votes / totalVotesCount) * 100) : 0;
    
    const optionText = 
      pOpt.text || 
      pOpt.title || 
      pOpt.label || 
      pOpt.value || 
      pOpt.name || 
      "Вариант ответа";

    return {
      id: opt.id,
      label: optionText,
      votesCount: votes,
      percent,
    };
  });

  const currentDateStr = new Date().toLocaleDateString("ru-RU");

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 text-zinc-100 print:p-0 print:m-0 print:max-w-none print:text-black">
      {/* Навигация и кнопка печати (скрываются при печати) */}
      <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4 print:hidden">
        <Link
          href={`/app/buildings/${buildingId}/legal-voting`}
          className="inline-flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к списку голосований
        </Link>

        <PrintProtocolButton />
      </div>

      {/* БЛАНК ПРОТОКОЛА */}
      <div className="bg-zinc-900 text-zinc-100 p-8 rounded-2xl shadow-xl border border-zinc-800 space-y-6 text-sm font-sans print:bg-white print:text-black print:p-0 print:shadow-none print:border-none print:w-full">
        
        {/* Шапка */}
        <div className="text-center space-y-1.5 border-b border-zinc-800 print:border-zinc-300 pb-4">
          <h1 className="text-xl font-bold uppercase tracking-wide text-white print:text-black">
            ПРОТОКОЛ ОБЩЕГО СОБРАНИЯ СОБСТВЕННИКОВ
          </h1>
          <p className="text-xs text-zinc-400 print:text-zinc-600 font-medium">
            многоквартирного жилого дома по адресу:
          </p>
          <p className="font-semibold text-base pt-0.5 text-emerald-400 print:text-black">
            {building?.address}{building?.city ? `, г. ${building.city}` : ""}
          </p>
        </div>

        {/* Сведения */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs border-b border-zinc-800 print:border-zinc-200 pb-4 text-zinc-300 print:text-black">
          <div className="space-y-1">
            <p><strong>Дата формирования:</strong> {currentDateStr}</p>
            <p><strong>Период голосования:</strong> с {startDateStr} по {endDateStr}</p>
            <p><strong>Форма проведения:</strong> Письменный опрос / Электронное голосование</p>
          </div>
          <div className="space-y-1">
            <p><strong>Всего квартир/помещений:</strong> {totalApartments}</p>
            <p><strong>Приняло участие:</strong> {totalVotesCount} ({votedPercent}%)</p>
            <p><strong>Требуемый кворум:</strong> {requiredQuorum}%</p>
          </div>
        </div>

        {/* Кворум */}
        <div className={`p-3.5 rounded-xl border text-xs font-medium ${
          isQuorumReached 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 print:bg-emerald-50 print:border-emerald-300 print:text-emerald-950" 
            : "bg-amber-500/10 border-amber-500/20 text-amber-300 print:bg-amber-50 print:border-amber-300 print:text-amber-950"
        }`}>
          <strong>СВЕДЕНИЯ О КВОРУМЕ:</strong>{" "}
          {isQuorumReached ? (
            <span>Кворум достигнут ({votedPercent}% из {requiredQuorum}%). Собрание правомочно принимать решения.</span>
          ) : (
            <span>Кворум НЕ достигнут ({votedPercent}% из {requiredQuorum}%). Собрание неправомочно.</span>
          )}
        </div>

        {/* Повестка дня */}
        <div className="space-y-3 pt-2">
          <h2 className="font-bold text-base border-b border-zinc-800 print:border-zinc-300 pb-1 uppercase text-white print:text-black">
            Повестка дня и результаты голосования
          </h2>
          
          <div className="space-y-1">
            <p className="font-semibold text-sm text-zinc-200 print:text-black">
              Вопрос: {pAny.title || pAny.question || "Официальное голосование"}
            </p>
            {pAny.description && (
              <p className="text-xs text-zinc-400 print:text-zinc-600">{pAny.description}</p>
            )}
          </div>

          {/* Таблица вариантов */}
          <table className="w-full text-left border-collapse border border-zinc-800 print:border-zinc-300 text-xs mt-3">
            <thead>
              <tr className="bg-zinc-950/60 print:bg-zinc-100 text-zinc-300 print:text-black">
                <th className="border border-zinc-800 print:border-zinc-300 p-2 font-bold">Вариант решения</th>
                <th className="border border-zinc-800 print:border-zinc-300 p-2 font-bold text-center w-32">Количество голосов</th>
                <th className="border border-zinc-800 print:border-zinc-300 p-2 font-bold text-center w-28">Процент</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800 print:divide-zinc-300 text-zinc-300 print:text-black">
              {optionsResult.map((opt) => (
                <tr key={opt.id} className="hover:bg-zinc-800/30 print:hover:bg-transparent">
                  <td className="border border-zinc-800 print:border-zinc-300 p-2 font-medium text-zinc-200 print:text-black">
                    {opt.label}
                  </td>
                  <td className="border border-zinc-800 print:border-zinc-300 p-2 text-center">{opt.votesCount}</td>
                  <td className="border border-zinc-800 print:border-zinc-300 p-2 text-center font-semibold text-emerald-400 print:text-black">{opt.percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Итог */}
          <div className="pt-2 text-xs text-zinc-300 print:text-black">
            <strong>РЕШЕНИЕ:</strong>{" "}
            {isQuorumReached ? (
              <span>Решение считается <strong>ПРИНЯТЫМ</strong> большинством голосов участников.</span>
            ) : (
              <span>Решение <strong>НЕ ПРИНЯТО</strong> из-за отсутствия кворума.</span>
            )}
          </div>
        </div>

        {/* Подписи */}
        <div className="pt-8 space-y-6 text-xs print:pt-12 text-zinc-300 print:text-black">
          <p className="font-bold text-zinc-200 print:text-black">ПОДПИСИ ИНИЦИАТОРОВ И СЕКРЕТАРЯ СОБРАНИЯ:</p>

          <div className="grid grid-cols-2 gap-8 pt-2">
            <div className="space-y-1">
              <p className="font-semibold">Председатель ОСИ / Собрания:</p>
              <div className="border-b border-zinc-700 print:border-zinc-400 h-8"></div>
              <p className="text-[10px] text-zinc-500 print:text-zinc-500">(Подпись / Ф.И.О.)</p>
            </div>

            <div className="space-y-1">
              <p className="font-semibold">Секретарь собрания:</p>
              <div className="border-b border-zinc-700 print:border-zinc-400 h-8"></div>
              <p className="text-[10px] text-zinc-500 print:text-zinc-500">(Подпись / Ф.И.О.)</p>
            </div>
          </div>

          <div className="pt-6 text-[10px] text-zinc-500 text-center border-t border-zinc-800 print:border-zinc-200">
            Сформировано в системе управления домами Fixly • Легитимно по ЖК РК
          </div>
        </div>
      </div>
    </div>
  );
}