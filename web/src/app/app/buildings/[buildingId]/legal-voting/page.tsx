import { prisma } from "@/lib/prisma";
import { getCurrentAuth } from "@/lib/auth/session";
import { activeChairmanOsi } from "@/lib/auth/guards";
import { DeleteVotingButton } from "./delete-voting-button";
import Link from "next/link";
import { redirect } from "next/navigation";
import { 
  Vote, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  FileCheck, 
  Users, 
  ShieldCheck, 
  ChevronRight,
  Building2,
  AlertTriangle,
  FolderOpen
} from "lucide-react";

export default async function LegalVotingPage({
  params,
}: {
  params: Promise<{ buildingId: string }>;
}) {
  const { buildingId } = await params;

  // 1. Получаем авторизованного пользователя через хелперы сессии
  const auth = await getCurrentAuth().catch(() => null);
  if (!auth) redirect("/login");

  const chairmanOsi = activeChairmanOsi(auth);
  const isSuperadmin = Boolean(auth.user?.isSuperadmin);

  // 2. Поиск конкретного дома
  const building = await prisma.building.findUnique({
    where: { id: buildingId },
    select: {
      id: true,
      osiId: true,
      address: true,
      city: true,
      apartmentsCount: true,
    },
  });

  // Флаг управления: Суперадмин ИЛИ Председатель в этой ОСИ
  const isManagement =
    isSuperadmin ||
    Boolean(chairmanOsi && building && chairmanOsi === building.osiId) ||
    Boolean(chairmanOsi);

  // Экран ошибки / выбора другого дома
  if (!building) {
    const allBuildings = await prisma.building.findMany({
      select: {
        id: true,
        address: true,
        city: true,
      },
    });

    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6 text-zinc-100 my-8">
        <div className="p-6 bg-zinc-900 border border-zinc-800 rounded-2xl space-y-4 shadow-xl">
          <div className="flex items-center gap-3 text-amber-400">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <h1 className="text-xl font-bold">Дом с этим ID не найден в текущей базе</h1>
          </div>

          <div className="p-3 bg-zinc-950 rounded-lg text-xs font-mono text-zinc-400 space-y-1 border border-zinc-800/80">
            <p><strong>Запрошенный ID из URL:</strong> <span className="text-amber-300">{buildingId}</span></p>
            <p><strong>Всего домов в базе:</strong> {allBuildings.length}</p>
          </div>

          {allBuildings.length === 0 ? (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
              <p className="font-semibold">Таблица Building пустая!</p>
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              <p className="text-sm font-semibold text-zinc-300">
                Выберите один из домов из базы:
              </p>
              <div className="grid grid-cols-1 gap-2.5">
                {allBuildings.map((b) => (
                  <Link
                    key={b.id}
                    href={`/app/buildings/${b.id}/legal-voting`}
                    className="p-4 bg-zinc-950 border border-zinc-800 hover:border-emerald-500/60 rounded-xl flex items-center justify-between transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <Building2 className="w-5 h-5 text-emerald-400" />
                      <div>
                        <p className="font-medium text-white group-hover:text-emerald-400 transition-colors">{b.address}</p>
                        <p className="text-xs text-zinc-500">{b.city || "Город не указан"}</p>
                      </div>
                    </div>
                    <span className="text-xs font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1 rounded border border-zinc-800 group-hover:border-emerald-500/40">
                      ID: {b.id} →
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 3. Загружаем голосования вместе с посчитанными голосами
  const dbPolls = await prisma.poll.findMany({
    where: { buildingId },
    include: {
      options: {
        include: {
          _count: {
            select: { votes: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Подготовка данных для UI
  const totalApartments = building.apartmentsCount && building.apartmentsCount > 0 ? building.apartmentsCount : 1;

  const votings = dbPolls.map((poll) => {
    const pAny = poll as any;
    
    // Подсчет всех голосов по всем вариантам
    const votesCount = poll.options.reduce(
      (sum, opt) => sum + (opt._count?.votes ?? 0),
      0
    );
    const votedPercent = Math.min(100, Math.round((votesCount / totalApartments) * 100));
    
    // Порог кворума из модели или 50% по умолчанию
    const requiredQuorum = Number(pAny.quorumThreshold) || 50;

    // Безопасное чтение дат
    const startDateObj = pAny.startDate ? new Date(pAny.startDate) : new Date(poll.createdAt);
    const endDateObj = pAny.endDate ? new Date(pAny.endDate) : (pAny.deadline ? new Date(pAny.deadline) : null);

    const startDateStr = startDateObj.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });

    const endDateStr = endDateObj
      ? endDateObj.toLocaleDateString("ru-RU", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        })
      : "В процессе";

    // Определение статуса
    const isExpired = endDateObj ? endDateObj < new Date() : false;
    const isClosed = Boolean(pAny.closed) || isExpired;

    return {
      id: poll.id,
      title: pAny.title || pAny.question || "Официальное голосование",
      description: pAny.description || "Официальное юридическое голосование собственников квартир.",
      status: isClosed ? "CLOSED" : "ACTIVE",
      type: pAny.type === "LEGALLY_BINDING" ? "Юридически значимое ОСС" : "Официальное ОСС",
      startDate: startDateStr,
      endDate: endDateStr,
      votedPercent,
      requiredQuorum,
      isQuorumReached: votedPercent >= requiredQuorum,
    };
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-zinc-100">
      {/* Шапка страницы */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Юридические голосования ОСИ
            </h1>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Легитимно по ЖК РК
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Объект: <span className="text-zinc-200 font-medium">{building.address}</span>
            {building.city ? ` (${building.city})` : ""} • Квартир: {building.apartmentsCount || "—"}
          </p>
        </div>

        {/* Кнопка создания видна ТОЛЬКО председателю/админу */}
        {isManagement && (
          <Link
            href={`/app/buildings/${buildingId}/legal-voting/new`}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm rounded-lg transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Инициировать ОСС
          </Link>
        )}
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Всего проведённых ОСС</span>
            <FileCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-white">{votings.length}</p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Активные голосования</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold text-amber-400">
            {votings.filter((v) => v.status === "ACTIVE").length}
          </p>
        </div>

        <div className="p-4 bg-zinc-900/60 border border-zinc-800 rounded-xl space-y-1">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-medium">
            <span>Подпись ЭЦП / eGov</span>
            <ShieldCheck className="w-4 h-4 text-blue-400" />
          </div>
          <p className="text-2xl font-bold text-blue-400">Скоро</p>
        </div>
      </div>

      {/* Список повестки дня */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Vote className="w-5 h-5 text-emerald-400" />
          Повестки дня и протоколы
        </h2>

        {votings.length === 0 ? (
          <div className="p-12 bg-zinc-900/30 border border-zinc-800/80 rounded-2xl text-center space-y-3">
            <FolderOpen className="w-10 h-10 text-zinc-500 mx-auto" />
            <div className="space-y-1">
              <p className="text-base font-semibold text-zinc-200">Голосования еще не проводились</p>
              <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                {isManagement 
                  ? "Создайте первое юридическое общее собрание собственников для этого дома."
                  : "В вашем доме пока нет активных или завершенных собраний собственников."}
              </p>
            </div>
            {isManagement && (
              <div className="pt-2">
                <Link
                  href={`/app/buildings/${buildingId}/legal-voting/new`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Инициировать ОСС
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {votings.map((voting) => (
              <div 
                key={voting.id}
                className="p-5 bg-zinc-900/40 border border-zinc-800 hover:border-zinc-700 rounded-xl transition-all space-y-4 group"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        voting.status === "ACTIVE" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                          : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                      }`}>
                        {voting.status === "ACTIVE" && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        )}
                        {voting.status === "ACTIVE" ? "Идёт голосование" : "Завершено"}
                      </span>
                      <span className="text-xs text-zinc-400 bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/50">
                        {voting.type}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-white group-hover:text-emerald-400 transition-colors pt-1">
                      {voting.title}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      {voting.description}
                    </p>
                  </div>

                  {/* Блок кнопок действий */}
                  <div className="flex items-center gap-2 self-start flex-wrap">
                    {isManagement ? (
                      /* Председатель / Админ всегда видит «Протокол» */
                      <Link
                        href={`/app/buildings/${buildingId}/legal-voting/${voting.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                        Протокол
                        <ChevronRight className="w-3.5 h-3.5 text-zinc-400" />
                      </Link>
                    ) : voting.status === "ACTIVE" ? (
                      /* Обычный житель во время активного голосования */
                      <Link
                        href={`/app/buildings/${buildingId}/legal-voting/${voting.id}`}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 text-xs font-bold rounded-lg transition-all shadow-md shadow-emerald-500/10"
                      >
                        <Vote className="w-4 h-4" />
                        Проголосовать
                      </Link>
                    ) : (
                      /* Обычный житель после завершения */
                      <Link
                        href={`/app/buildings/${buildingId}/legal-voting/${voting.id}`}
                        className="inline-flex items-center gap-1 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition-colors whitespace-nowrap"
                      >
                        Протокол
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    )}

                    {isManagement && (
                      <DeleteVotingButton pollId={voting.id} buildingId={buildingId} />
                    )}
                  </div>
                </div>

                {/* Шкала кворума */}
                <div className="bg-zinc-950/50 p-3.5 rounded-lg border border-zinc-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-zinc-400" />
                      Кворум собственников:
                    </span>
                    <span className="font-semibold text-white">
                      {voting.votedPercent}% / {voting.requiredQuorum}%
                    </span>
                  </div>

                  <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${voting.votedPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-zinc-400 pt-0.5">
                    <span className={`font-medium flex items-center gap-1 ${voting.isQuorumReached ? "text-emerald-400" : "text-amber-400"}`}>
                      <CheckCircle2 className="w-3 h-3" />
                      {voting.isQuorumReached ? "Кворум достигнут" : "Сбор голосов..."}
                    </span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <Calendar className="w-3 h-3" /> Создано: {voting.startDate} (до: {voting.endDate})
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}