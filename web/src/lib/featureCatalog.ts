// Единый каталог функций (REQ-140..142, docs/specs/onboarding-unified.md §2) — один источник
// для сайта; зеркало на стороне приложения — lib/core/feature_catalog.dart (та же таблица,
// НЕ общий код между репозиториями). Статус в этом файле отражает ТЕКУЩЕЕ состояние (после
// среза R2 несколько строк, отмеченных в спеке как 🔜→✅, стали ✅ для председателя в
// приложении) — расходится со снимком в спеке на дату её написания, это ожидаемо.

export type FeatureStatus = "done" | "soon" | "site-only" | "hidden";

export interface FeatureCatalogItem {
  key: string;
  label: string;
  /** Опциональное поле для активной ссылки (роут) */
  href?: string; 
  /** ✅/🔜 на сайте (обе роли сайта — резидент и председатель уже разделены интерфейсом, но
   *  статус функции как таковой на сайте один). */
  site: FeatureStatus;
  /** Статус в приложении для жителя. */
  resident: FeatureStatus;
  /** Статус в приложении для председателя. */
  chairman: FeatureStatus;
  /** Номер среза/блокера — только для site-статуса "soon" (REQ-141: честный срок). */
  srez?: string;
  /** 1–2 фразы: что будет и что работает уже сейчас (REQ-141). */
  note?: string;
}

export const FEATURE_CATALOG: FeatureCatalogItem[] = [
  {
    key: "otp-login",
    label: "Вход по коду",
    site: "done",
    resident: "done",
    chairman: "done",
  },
  {
    key: "osi-onboarding",
    label: "Создание ОСИ и дома",
    site: "done",
    resident: "hidden",
    chairman: "done",
  },
  {
    key: "residents-registry",
    label: "Реестр квартир и жителей",
    site: "done",
    resident: "hidden",
    chairman: "done",
  },
  {
    key: "announcements",
    label: "Объявления",
    site: "done",
    resident: "done",
    chairman: "done",
  },
  {
    key: "requests",
    label: "Заявки и переписка",
    site: "done",
    resident: "done",
    chairman: "done",
  },
  {
    key: "building-info",
    label: "Инфо-раздел дома",
    site: "done",
    resident: "done",
    chairman: "site-only",
    note: "Наполнение раздела (реквизиты, контакты, вывоз мусора) — из кабинета на сайте.",
  },
  {
    key: "notifications",
    label: "Уведомления",
    site: "done",
    resident: "done",
    chairman: "done",
  },
  {
    key: "push",
    label: "Push-уведомления",
    site: "done",
    resident: "done",
    chairman: "done",
    note: "Код готов, доставка требует ключей VAPID/FIREBASE на проде.",
  },
  {
    key: "polls",
    label: "Опросы и голосования (lite)",
    site: "done",
    resident: "done",
    chairman: "done",
  },
  {
    key: "online-payment",
    label: "Онлайн-оплата (демо)",
    site: "done",
    resident: "done",
    chairman: "hidden",
  },
  {
    key: "finance",
    label: "Тарифы, начисления, платежи",
    site: "done",
    resident: "done",
    chairman: "site-only",
    note: "Управление финансами дома — desktop-задача, остаётся на сайте.",
  },
  {
    key: "reports-163",
    label: "Отчёты по форме №163",
    site: "done",
    resident: "soon",
    chairman: "site-only",
    srez: "33+",
    note: "Публикуются на сайте уже сейчас. В приложении появится просмотр опубликованных отчётов.",
  },
  {
    key: "bank-import",
    label: "Импорт банковской выписки",
    site: "soon",
    resident: "hidden",
    chairman: "hidden",
    srez: "Q-012",
    note: "Ждёт образец выписки Kaspi Pay для парсера. Начисления пока вносятся вручную.",
  },
  {
    key: "marketplace",
    label: "Маркетплейс мастеров",
    // Срез 25: цикл публикация→отклик→принятие для роли МАСТЕРА уже в приложении
    // (MasterHomeShell, marketplace.md §6) — но мастер не входит в этот каталог (не резидент
    // и не председатель, ADR-0009: identity вне ОСИ). Для резидента функция неприменима (не
    // выбирает мастера напрямую); председатель публикует заявку и принимает отклики на сайте
    // (REQ-121 — управление заявкой), оперативной кнопки в приложении для этого не появилось.
    site: "done",
    resident: "hidden",
    chairman: "site-only",
    note: "Публикация заявки мастерам и приём откликов — в кабинете председателя на сайте.",
  },
  {
    key: "masters-map",
    label: "Карта и портфолио мастеров",
    site: "done",
    resident: "done",
    chairman: "done",
    note: "Поиск проверенных мастеров города и портфолио работ.",
  },
  {
    key: "calls",
    label: "Звонки с мастером",
    site: "hidden",
    resident: "soon",
    chairman: "soon",
    srez: "29",
    note: "Видеозвонок прямо из заявки/отклика — в разработке.",
  },
  {
    key: "ai-chat",
    label: "AI-помощник",
    site: "done",
    resident: "done",
    chairman: "done",
    note: "Ассистент активен: подсказки по заявкам и документам.",
  },
  {
    key: "yolo-scanner",
    label: "Сканер дефектов по фото",
    site: "hidden",
    resident: "soon",
    chairman: "hidden",
    srez: "31",
    note: "Автоматическое распознавание проблемы по фото при подаче заявки. Ждёт Q-061.",
  },
  {
    key: "documents-library",
    label: "Библиотека документов",
    site: "done",
    resident: "done",
    chairman: "done",
    note: "Уставные документы, протоколы, образцы — общий доступ жителям и председателю.",
  },
  {
    key: "chairman-analytics",
    label: "Аналитика председателя",
    site: "done",
    resident: "hidden",
    chairman: "soon",
    srez: "33+",
    note: "Базовый дашборд уже на сайте. В приложении появятся те же графики.",
  },
  {
    key: "pdf-receipt",
    label: "PDF-квитанция",
    site: "done",
    resident: "done",
    chairman: "done",
    note: "Формирование и печать квитанции за месяц одним файлом.",
  },
  {
    key: "admin-panel",
    label: "Админка платформы",
    site: "done",
    resident: "hidden",
    chairman: "hidden",
    note: "Только для суперадминистратора платформы, не для председателя ОСИ.",
  },
  {
    key: "legal-voting",
    label: "Юридически значимые голосования",
    href: "/voting", // <-- Добавлена активная ссылка. Замените "/voting" на ваш реальный URL/роут
    site: "done",
    resident: "done",
    chairman: "done",
    note: "Официальные голосования с подсчётом кворума по площади и фиксацией подписей.",
  },
];

/** Пункты, ещё не готовые на сайте (REQ-140/141) — для секции «Скоро» в сайдбаре. */
export function siteSoonItems(): FeatureCatalogItem[] {
  return FEATURE_CATALOG.filter((item) => item.site === "soon");
}