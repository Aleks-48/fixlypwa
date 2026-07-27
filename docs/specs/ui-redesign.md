# UI-редизайн по макету «Дом · PWA дизайн» (Claude Design)

> ⚠️ **ПАЛИТРА SUPERSEDED (2026-07-17):** цветовая схема этой спеки (синий #2E6BF0) заменена
> единым стилем «шалфей и песок» из темы приложения fixly — см. `ui-unification.md`
> (решение Рахима). Структурные решения ниже (сайдбар/таб-бар, навигационная карта, AppShell,
> Golos Text) остаются в силе.

Статус: принят 2026-07-03, палитра пересмотрена 2026-07-17. Источник — handoff-бандл
`pwa/project/Дом · PWA дизайн.dc.html`
(12 десктоп-экранов 1440px, 5 мобильных 375px, светлая+тёмная темы).

Решения (утверждены Рахимом):
1. **Палитра полностью из дизайна**: синий primary `#2E6BF0` + шрифт Golos Text
   (заменяют teal + Geist из среза 11).
2. **Функции без бэкенда** — заглушки в UI (см. §4), бэкенд/схема не меняются.
3. **Председатель** — сайдбар с переключателем дома; маршруты
   `/app/buildings/[buildingId]/...` не меняются.

## 1. Токены (light / dark → shadcn-переменные в globals.css)

| shadcn | Light | Dark | Токен дизайна |
|---|---|---|---|
| `--background` | `#F4F6FA` | `#0E1320` | `--page` |
| `--card`, `--popover` | `#FFFFFF` | `#171F2F` | `--surface` |
| `--secondary`, `--muted` | `#EFF2F8` | `#202A3C` | `--surface-2` |
| `--foreground` | `#111827` | `#E9EEF7` | `--text` |
| `--muted-foreground` | `#6B7280` | `#93A0B5` | `--text-2` |
| `--primary` | `#2E6BF0` | `#5B93FF` | `--primary` |
| `--primary-foreground` | `#FFFFFF` | `#FFFFFF` | |
| `--accent` | `#EAF1FE` | `rgba(91,147,255,.16)` | `--primary-soft` |
| `--accent-foreground` | `#2E6BF0` | `#5B93FF` | |
| `--destructive` | `#E5453A` | `#FF7A70` | `--danger` |
| `--success` | `#12B76A` | `#3DDC97` | |
| `--warning` | `#C77700` | `#FBBF5A` | |
| `--border`, `--input` | `#E5E9F0` | `#273040` | `--border` |
| `--ring` | primary /50% | primary /50% | |

Новые: `--success-soft` `#E6F7EF`/`rgba(61,220,151,.15)`, `--warning-soft`
`#FBF0DE`/`rgba(251,191,90,.16)`, `--destructive-soft` `#FBE9E7`/`rgba(255,122,112,.16)`
(+ `--color-*-soft` в `@theme inline` → утилиты `bg-success-soft` и т.п.).
Радиусы: `--radius: 1rem`; `--radius-xl = var(--radius)` (16px), `--radius-2xl = +2px` (18px) —
карточки дизайна 16–18px, контролы 12–13px (`rounded-md`).
⚠️ На alpha-переменных (`--accent`, `*-soft` в dark) НЕ использовать slash-модификаторы
(`bg-accent/50` — двойная альфа).

Шрифт: `Golos_Text` (`next/font/google`, subsets cyrillic+latin, variable `--font-sans`).
Иконки — lucide (уже используются). Manifest/`viewport.themeColor`: `#2E6BF0` / dark `#0E1320`.

## 2. Каркас (app shell)

- Desktop (lg+): сайдбар 264px (брендблок, навигация, user-card внизу) + шапка страницы 76px.
- Mobile (<lg): компактная шапка + нижний таб-бар (safe-area).
- Общий `src/app/app/layout.tsx` (server) + `AppShell`/`AppSidebar`/`MobileTabBar`/
  `PageHeader`/`UserCard`/`BuildingSwitcher` в `src/app/app/_components/`.
- Онбординг (нет ОСИ) — минимальный шелл без сайдбара.

## 3. Карта «экран дизайна → маршрут → файл»

| Экран дизайна | Маршрут | Файл | Примечание |
|---|---|---|---|
| Вход | `/login` | `src/app/login/*` | UI-сплит; auth-флоу прежний (OTP = «Войти по SMS-коду») |
| Регистрация | `/register` | `src/app/register/page.tsx` | НОВЫЙ, visual-only заглушка |
| Председатель · Обзор | `/app` | `src/app/app/page.tsx` | + сохранить список домов, AddBuildingForm, CreateOsiForm |
| Председатель · Финансы | `/app/buildings/[id]/finance` | `…/finance/page.tsx` | Hero-баланс, BarChart, должники |
| Председатель · Голосования | `…/polls` | `…/polls/page.tsx` | Tabs Активные/Завершённые |
| Председатель · Заявки | `…/requests` | `…/requests/page.tsx` | FilterPills + таблица/карточки |
| Председатель · Объявления | `…/announcements` | `…/announcements/page.tsx` | 2 колонки на lg |
| Житель · Обзор | `/app` | `src/app/app/page.tsx` | StatCards + оплата + опрос + новости |
| Житель · Голосования | `/app/polls` | НОВЫЙ `src/app/app/polls/page.tsx` | данные listPolls (реальные) |
| Житель · Заявки | `/app/requests` | `…/requests/page.tsx` | StatusTimeline, категория — нативный select |
| Житель · Платежи | `/app/payments` | НОВЫЙ `…/payments/page.tsx` | residentBalances + 2 новых read-only хелпера |
| Житель · Новости | `/app/news` | НОВЫЙ `…/news/page.tsx` | listAnnouncements + MarkReadButton |
| — (нет в дизайне) | `/app/info` | сохранить | доступ из Профиля; `resident-report-link` живёт тут |
| — (нет в дизайне) | `…/reports`, `…/info` | сохранить | вторичная группа сайдбара председателя |

Навигация (ревизия 2026-07-04, заметки Рахима п.4/6/7). Житель — 4 главные вкладки:
Обзор / Голосования / Мои заявки / **Финансы** (`/app/payments`: вкладки Платежи | Отчёты —
опубликованные отчёты переехали сюда из /app/info); Профиль + вторичные Новости, Инфо дома —
в сайдбаре и мобильном меню. Новости живут лентой на Обзоре. Председатель: сайдбар
Обзор/Голосования/Заявки/Финансы/Объявления (+Отчёты, Инфо; Настройки — заглушка); таб-бар
Обзор/Голоса/Заявки/Финансы. **Мобильное меню-шторка** (кнопка-аватар в шапке, <lg):
полная навигация + переключатели ОСИ/дома + Профиль + тема + выход — единый список пунктов
с сайдбаром (`navItems.ts`). ThemeToggle есть и на публичных страницах (/, /login, /register).
«Связаться с председателем» (п.8): карточка на Обзоре жителя — контакты из CHAIRMAN_CONTACTS +
кнопка «Написать председателю» → /app/requests?category=OTHER (обращение = заявка «Другое»,
тред уже есть). Отчёты за месяц/квартал/год — REQ-045 (report-spec.md §4а).

## 4. Заглушки (бэкенда нет — UI «скоро»)

| Фича | Реализация |
|---|---|
| Регистрация | `/register` visual-only, disabled submit, плашка «жителей подключает председатель» |
| Фото в заявке | dropzone disabled + «скоро» |
| «Оплатить онлайн» | кнопка → inline «Онлайн-оплата скоро» |
| Глобальный поиск | disabled input в шапке (desktop), скрыт на мобиле |
| «Настройки» (председатель) | disabled-пункт сайдбара |
| «Квитанция»/«Экспорт отчёта» | скрыты либо ведут на существующие /reports |

## 5. Правки e2e (тесты идут на Pixel 7 — мобильный вьюпорт)

- `e2e/finance.spec.ts:73`: `tab-info` уходит из таб-бара → `await rp.goto("/app/info")`.
- Всё остальное — сохранением testid/текстов: `tab-requests`, `nav-*` pills,
  `poll-card/option/my-option/pct`, `ann-row/ann-read/ann-readcount` («Прочитали: N»),
  `req-*` (категория — нативный select + selectOption), `request-card/request-status`,
  `tariff-*/charges-*/payment-*/balance-debt`, `report-*`, `building-link`, `osi-switcher`,
  `me`, testids логина, `cta-resident/cta-chairman`.
