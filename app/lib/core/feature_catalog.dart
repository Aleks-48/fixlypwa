// Единый каталог функций (REQ-140..142, docs/specs/onboarding-unified.md §2 в fixlypwa) —
// один источник для приложения; зеркало на стороне сайта — src/lib/featureCatalog.ts (та же
// таблица, НЕ общий код между репозиториями). Статус отражает ТЕКУЩЕЕ состояние: несколько
// строк, отмеченных в спеке на 2026-07-17 как 🔜→✅ (создание ОСИ, заявки и объявления
// председателя), стали ✅ после среза R2 — расхождение со снимком в спеке ожидаемо.

enum FeatureStatus {
  /// ✅ — работает.
  done,

  /// 🔜 — «Скоро», экран-заглушка с описанием и сроком (REQ-141).
  soon,

  /// 🌐 — «На сайте», для этой роли функция доступна только в веб-кабинете.
  siteOnly,

  /// Функция не показывается этой роли вовсе (неприменима).
  hidden,
}

class FeatureCatalogItem {
  final String key;
  final String label;
  final FeatureStatus resident;
  final FeatureStatus chairman;

  /// Номер среза/блокера — для soon (честный срок, REQ-141).
  final String? srez;

  /// 1–2 фразы: что будет и что работает уже сейчас (REQ-141).
  final String? note;

  const FeatureCatalogItem({
    required this.key,
    required this.label,
    required this.resident,
    required this.chairman,
    this.srez,
    this.note,
  });
}

const List<FeatureCatalogItem> kFeatureCatalog = [
  FeatureCatalogItem(
    key: 'otp-login',
    label: 'Вход по коду',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'osi-onboarding',
    label: 'Создание ОСИ и дома',
    resident: FeatureStatus.hidden,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'residents-registry',
    label: 'Реестр квартир и жителей',
    resident: FeatureStatus.hidden,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'announcements',
    label: 'Объявления',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'requests',
    label: 'Заявки и переписка',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'building-info',
    label: 'Инфо-раздел дома',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.siteOnly,
    note: 'Наполнение раздела (реквизиты, контакты, вывоз мусора) — из кабинета на сайте.',
  ),
  FeatureCatalogItem(
    key: 'notifications',
    label: 'Уведомления',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'push',
    label: 'Push-уведомления',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
    note: 'Код готов, доставка требует ключей VAPID/FIREBASE на проде.',
  ),
  FeatureCatalogItem(
    key: 'polls',
    label: 'Опросы и голосования (lite)',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'online-payment',
    label: 'Онлайн-оплата (демо)',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.hidden,
  ),
  // ✅ Обновлено: «Тарифы, начисления, платежи» теперь isAvailable: true (зелёная галочка)
  // для обеих ролей — chairman был siteOnly, стал done.
  FeatureCatalogItem(
    key: 'finance',
    label: 'Тарифы, начисления, платежи',
    resident: FeatureStatus.done,
    chairman: FeatureStatus.done,
  ),
  FeatureCatalogItem(
    key: 'reports-163',
    label: 'Отчёты по форме №163',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.siteOnly,
    srez: '33+',
    note: 'Публикуются на сайте уже сейчас. Здесь появится просмотр опубликованных отчётов.',
  ),
  FeatureCatalogItem(
    key: 'marketplace',
    label: 'Маркетплейс мастеров',
    // Срез 25: цикл публикация→отклик→принятие для роли МАСТЕРА уже в приложении
    // (MasterHomeShell) — но мастер не входит в этот каталог (не резидент и не председатель,
    // ADR-0009: identity вне ОСИ). Для резидента функция неприменима (не выбирает мастера
    // напрямую, mobile-app.md §4); председатель публикует заявку мастерам и принимает отклики
    // на сайте (REQ-121 — управление заявкой) — оперативной кнопки «в приложении» для этого
    // не появилось за пределами объёма среза 25.
    resident: FeatureStatus.hidden,
    chairman: FeatureStatus.siteOnly,
    note: 'Публикация заявки мастерам и приём откликов — в кабинете председателя на сайте.',
  ),
  FeatureCatalogItem(
    key: 'masters-map',
    label: 'Карта и портфолио мастеров',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.hidden,
    srez: '28',
    note: 'Поиск мастера рядом с домом и его примеры работ — в разработке.',
  ),
  FeatureCatalogItem(
    key: 'calls',
    label: 'Звонки с мастером',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.soon,
    srez: '29',
    note: 'Видеозвонок прямо из заявки/отклика — в разработке.',
  ),
  FeatureCatalogItem(
    key: 'ai-chat',
    label: 'AI-помощник',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.soon,
    srez: '30',
    note: 'Подсказки по заявкам и документам. Ждёт решения о размещении данных (Q-061).',
  ),
  FeatureCatalogItem(
    key: 'yolo-scanner',
    label: 'Сканер дефектов по фото',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.hidden,
    srez: '31',
    note: 'Автоматическое распознавание проблемы по фото при подаче заявки. Ждёт Q-061.',
  ),
  FeatureCatalogItem(
    key: 'documents-library',
    label: 'Библиотека документов',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.soon,
    srez: '32',
    note: 'Уставные документы, протоколы, образцы — общий доступ жителям и председателю.',
  ),
  FeatureCatalogItem(
    key: 'chairman-analytics',
    label: 'Аналитика председателя',
    resident: FeatureStatus.hidden,
    chairman: FeatureStatus.soon,
    srez: '33+',
    note: 'Базовый дашборд уже на сайте. Здесь появятся те же графики.',
  ),
  FeatureCatalogItem(
    key: 'pdf-receipt',
    label: 'PDF-квитанция',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.hidden,
    srez: '33+',
    note: 'Квитанция за месяц одним файлом — для печати или архива.',
  ),
  // ✅ Исправлена опечатка: было srez: 'Тир 2', стало 'Тип 2' (запрошено как «срез Тип 2»).
  FeatureCatalogItem(
    key: 'legal-voting',
    label: 'Юридически значимые голосования',
    resident: FeatureStatus.soon,
    chairman: FeatureStatus.soon,
    srez: 'Тип 2',
    note:
        'Голосование с ЭЦП и подсчётом кворума по закону — ждёт партнёрства с аккредитованным оператором.',
  ),
];

class FeatureCatalogEntry {
  final FeatureCatalogItem item;
  final FeatureStatus status;
  const FeatureCatalogEntry(this.item, this.status);
}

/// Пункты каталога для роли (без hidden) — «Ещё»/«Профиль» рендерят целиком (REQ-140).
List<FeatureCatalogEntry> featureCatalogFor({required bool isChairman}) {
  return kFeatureCatalog
      .map((item) => FeatureCatalogEntry(item, isChairman ? item.chairman : item.resident))
      .where((e) => e.status != FeatureStatus.hidden)
      .toList();
}