import { prisma } from "@/lib/prisma";
import { AssignMasterSelect, MasterOption } from "@/components/requests/AssignMasterSelect";
import { AssignedMasterCard } from "@/components/requests/AssignedMasterCard";
import { TicketReviewForm } from "@/components/requests/TicketReviewForm";
import { AcceptOfferButton } from "@/components/requests/AcceptOfferButton";

interface RequestPageProps {
  params: Promise<{ id: string }>;
}

// Форматирование имени мастера: "Иванов Иван Сергеевич" -> "Иванов И."
function formatShortName(fullName: string): string {
  if (!fullName) return "Мастер";
  const parts = fullName.trim().split(/\s+/);
  return parts[0] && parts[1] ? `${parts[0]} ${parts[1].charAt(0)}.` : fullName;
}

export default async function RequestDetailPage({ params }: RequestPageProps) {
  const { id } = await params;

  let dbError: string | null = null;
  let rawRequest = null;

  try {
    rawRequest = await prisma.request.findUnique({
      where: { id },
    });
  } catch (err: any) {
    dbError = err.message;
  }

  // Фоллбек для тестирования интерфейса по URL /app/requests/test
  if (!rawRequest && id === "test") {
    rawRequest = {
      id: "test-34f4e5d4-fdb0",
      osiId: "osi-123-456",
      buildingId: "building-789",
      apartmentId: "apt-12",
      authorUserId: "user-test",
      category: "PLUMBING" as any,
      text: "Лопнула труба под раковиной на кухне, вода капает на пол. Нужен срочный ремонт!",
      photoUrls: [],
      status: "IN_PROGRESS" as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  }

  // Если заявка не найдена в БД — показываем информативный блок вместо глупого 404
  if (!rawRequest) {
    return (
      <div className="max-w-xl mx-auto p-6 mt-12 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 font-bold">
            !
          </span>
          <div>
            <h1 className="text-base font-bold text-slate-900 m-0">Заявка не найдена</h1>
            <p className="text-xs text-slate-500 m-0">ID в базе: {id}</p>
          </div>
        </div>
        {dbError && (
          <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl border border-red-100 font-mono">
            Ошибка базы данных: {dbError}
          </p>
        )}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <a
            href="/app/requests"
            className="text-xs font-semibold text-blue-600 hover:underline"
          >
            ← Вернуться к списку заявок
          </a>
          <a
            href="/app/requests/test"
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-900 text-white"
          >
            Открыть тест (/test)
          </a>
        </div>
      </div>
    );
  }

  const request = rawRequest as any;
  const masterId = request.masterId as string | undefined | null;

  // 2. Запрашиваем отклики мастеров
  let offers = await (prisma as any).marketOffer
    ?.findMany({
      where: { listingId: request.id },
      include: { master: true },
    })
    .catch(() => []) || [];

  if (offers.length === 0 && id === "test") {
    offers = [
      {
        id: "offer-test-1",
        listingId: request.id,
        masterId: "master-test-1",
        status: "OFFERED",
        createdAt: new Date(),
        master: {
          id: "master-test-1",
          fullName: "Иванов Иван Сергеевич",
          phone: "+77001234567",
          categories: ["PLUMBING"],
        },
      },
    ];
  }

  // 3. Получаем назначенного мастера
  let master = masterId
    ? await (prisma as any).master
        .findUnique({
          where: { id: masterId },
        })
        .catch(() => null)
    : null;

  if (masterId && !master && id === "test") {
    master = {
      id: masterId,
      userId: "user-master-1",
      fullName: "Иванов Иван Сергеевич",
      phone: "+77001234567",
      categories: ["PLUMBING", "ELECTRICITY"],
      status: "APPROVED",
    };
  }

  // 4. Получаем отзыв по заявке
  const review = await (prisma as any).masterReview
    ?.findFirst({
      where: { requestId: request.id },
    })
    .catch(() => null);

  // 5. Запрашиваем все отзывы для расчета рейтингов
  const allReviews: Array<{ masterId: string; rating: number }> =
    (await (prisma as any).masterReview
      ?.findMany({
        select: { masterId: true, rating: true },
      })
      .catch(() => [])) || [];

  const ratingMap = new Map<string, { total: number; count: number }>();
  for (const r of allReviews) {
    const current = ratingMap.get(r.masterId) || { total: 0, count: 0 };
    ratingMap.set(r.masterId, {
      total: current.total + r.rating,
      count: current.count + 1,
    });
  }

  let assignedMasterRating = 5.0;
  if (master) {
    const stats = ratingMap.get(master.id);
    if (stats && stats.count > 0) {
      assignedMasterRating = stats.total / stats.count;
    } else if (id === "test") {
      assignedMasterRating = 4.9;
    }
  }

  const isChairman = true;
  const isResident = true;

  // 6. Список мастеров для ручного назначения
  let mastersOptions: MasterOption[] = [];
  if (isChairman) {
    let rawMasters =
      (await (prisma as any).master
        .findMany({
          where: { status: "APPROVED" },
        })
        .catch(() => [])) || [];

    if (rawMasters.length === 0 && id === "test") {
      rawMasters = [
        {
          id: "master-test-1",
          fullName: "Иванов Иван Сергеевич",
          phone: "+77001234567",
          categories: ["PLUMBING"],
          specialties: ["Сантехника"],
          experienceYears: 5,
        },
      ];
    }

    mastersOptions = rawMasters.map((m: any) => {
      const stats = ratingMap.get(m.id);
      const count = stats?.count || (id === "test" ? 8 : 0);
      const avgRating =
        stats && stats.count > 0 ? stats.total / stats.count : id === "test" ? 4.8 : 0;

      return {
        id: m.id,
        fullName: formatShortName(m.fullName),
        categories: (m.categories || []).map(String),
        specialties: (m.specialties || m.categories || []).map(String),
        experienceYears: m.experienceYears ?? 0,
        avgRating,
        reviewsCount: count,
      } as MasterOption;
    });
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 bg-slate-50 min-h-screen">
      {/* Карточка заявки */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
            {request.category === "PLUMBING" ? "Сантехника" : request.category}
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {request.status}
          </span>
        </div>

        <h1 className="text-lg font-bold text-slate-900">
          Заявка #{request.id?.slice(-6) || id}
        </h1>

        <p className="text-sm text-slate-700 leading-relaxed">{request.text}</p>

        <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100 flex justify-between">
          <span>Создана: {request.createdAt ? new Date(request.createdAt).toLocaleDateString("ru-RU") : "—"}</span>
          <span>ОСИ: {request.osiId ? `${request.osiId.slice(0, 8)}...` : "—"}</span>
        </div>
      </div>

      {/* Отклики мастеров */}
      {!masterId && offers.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Отклики мастеров ({offers.length})
            </h3>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
              Готовы приехать
            </span>
          </div>

          <div className="space-y-3">
            {offers.map((offer: any) => {
              const offerMaster = offer.master;
              const stats = ratingMap.get(offerMaster?.id);
              const rating =
                stats && stats.count > 0
                  ? (stats.total / stats.count).toFixed(1)
                  : "4.9";

              return (
                <div
                  key={offer.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3 hover:border-blue-300 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
                      {offerMaster?.fullName?.[0] || "М"}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 m-0">
                        {formatShortName(offerMaster?.fullName)}
                      </p>
                      <p className="text-xs text-amber-600 font-semibold m-0 mt-0.5">
                        ★ {rating} · Мастер откликнулся
                      </p>
                    </div>
                  </div>

                  <AcceptOfferButton offerId={offer.id} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ручное назначение председателем */}
      {isChairman && !masterId && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Все мастера города (Назначить вручную)
          </h3>
          <AssignMasterSelect
            requestId={request.id}
            category={request.category}
            masters={mastersOptions}
            currentMasterId={masterId}
          />
        </div>
      )}

      {/* Карточка назначенного мастера */}
      {master && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Исполнитель
          </h3>
          <AssignedMasterCard
            master={{
              id: master.id,
              fullName: formatShortName(master.fullName),
              phone: master.phone || "+77001234567",
              avgRating: assignedMasterRating,
              experienceYears: master.experienceYears ?? 0,
            }}
          />
        </div>
      )}

      {/* Блок отзыва */}
      {isResident && masterId && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Оценка и отзыв
          </h3>
          {review ? (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-bold text-base">
                  {"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}
                </span>
                <span className="text-xs text-slate-500 font-semibold">
                  ({review.rating} / 5)
                </span>
              </div>
              {review.comment && (
                <p className="text-xs text-slate-700 italic">
                  «{review.comment}»
                </p>
              )}
            </div>
          ) : (
            <TicketReviewForm
              requestId={request.id}
              osiId={request.osiId}
              masterId={masterId}
              masterName={formatShortName(master?.fullName || "Мастер")}
            />
          )}
        </div>
      )}
    </div>
  );
}