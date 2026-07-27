# ОСИ — PWA для управления домом (Тир 1 · Фаза 1)

Self-hosted PWA для управления ОСИ (объединение собственников имущества, Кокшетау, РК).
Стек: **Next.js (App Router) + TypeScript strict + PostgreSQL + Prisma**, мультитенантность
через **Postgres RLS**, вход по **телефону+OTP** (жители) и **email+пароль** (председатели).
Разворачивается одной командой в Docker. Данные — только на инфраструктуре в РК (NFR-001).

Подробности «зачем и что» — в `docs/` (SDD: спека → код). Стандарты сборки — `docs/mvp-build-prompt.md`.

---

## Требования
- **Docker** + Docker Compose (для полного стека одной командой).
- **Node.js ≥ 20** и **npm** (для локальной разработки без контейнера приложения).

## Быстрый старт — весь стек одной командой

```bash
cp .env.example .env      # при необходимости поменяйте пароли
docker compose up --build
```

Поднимутся: **Postgres → migrate (миграции + пароли ролей) → PgBouncer → Next.js → Nginx (HTTPS)**.
Приложение: **https://localhost** (локально — self-signed сертификат, браузер предупредит —
это ожидаемо; в проде — Let's Encrypt, см. ниже).

Проверка здоровья: `curl -k https://localhost/api/health` → `{"data":{"status":"ok","db":"up"}}`.

> Демо-данные (председатель/житель) не сеются автоматически. Засеять: `npm run seed`
> (см. «Локальная разработка») или выполнить в контейнере миграций.

## Локальная разработка (приложение на хосте, БД в Docker)

RLS работает, только если приложение ходит в БД **обычной ролью `app_login`** (суперпользователь
обходит RLS). Поэтому даже локально приложение подключается как `app_login`.

```bash
npm install
docker compose up -d postgres          # только БД (порт 5544)
npm run prisma:deploy                   # применить миграции (суперпользователь, DIRECT_URL)
npm run db:bootstrap                    # задать пароли ролей app_login/app_superadmin из .env
npm run seed                            # демо-ОСИ + председатель + житель (идемпотентно)
npm run dev                             # http://localhost:3000
```

### Готовые PowerShell-скрипты (Windows)

Оборачивают шаги выше в одну команду (запускать из `web/`):

| Скрипт | Когда использовать |
|---|---|
| `.\start.ps1` | Продолжить работу: Postgres уже проинициализирован, миграции/сид уже были. Поднимает БД (если не запущена) и `npm run dev` в текущем окне. |
| `.\start-fresh.ps1` | Первый запуск / после `docker compose down -v` / нужен публичный HTTPS для демо. Прогоняет `npm install` → миграции → `db:bootstrap` → `prisma generate` → `seed`, затем открывает Next.js и ngrok в отдельных окнах, печатает публичный адрес и перерегистрирует Telegram-вебхук (`TELEGRAM_BOT_TOKEN`/`TELEGRAM_WEBHOOK_SECRET` из `.env`). |

Оба скрипта требуют готовый `.env` (см. `.env.example`) и Docker Desktop.

> В dev PWA/service worker отключён (мешает hot reload). Проверять установку/офлайн — на
> prod-сборке (`npm run build && npm run start`) или в Docker.

### Демо-доступы (после `npm run seed`)
- **Председатель:** `demo@osi.kz` / `demo12345` — вход через `/login?role=chairman`.
- **Житель:** `+77010000001` — вход по OTP через `/login`. Код печатается в лог сервера
  (`SMS_PROVIDER=console`); при `OTP_DEV_ECHO=1` (только dev/тесты!) дополнительно
  показывается в UI как dev-подсказка. **В проде `OTP_DEV_ECHO=0`** — иначе любой сможет
  запросить и увидеть код чужого номера.

## Тесты

```bash
npm run typecheck          # tsc --noEmit (strict, без any)
npm run lint               # ESLint
npm test                   # unit (Vitest), без БД
npm run test:integration   # integration: RLS-изоляция + онбординг (нужна поднятая БД)
npm run e2e                # Playwright (соберёт prod и поднимет сервер сам)
```

Что доказывают integration-тесты (`tests/integration/`):
- запрос к tenant-таблице вне `forTenant` → **0 строк** (deny-by-default);
- ОСИ А не видит данные ОСИ Б; `WITH CHECK` блокирует запись в чужой тенант (ADR-0006).

## Скрипты
| Команда | Назначение |
|---|---|
| `npm run dev` / `build` / `start` | Next.js dev / prod-сборка / запуск |
| `npm run prisma:deploy` | Применить миграции (прод/CI) |
| `npm run prisma:migrate:dev` | Создать+применить миграцию (dev) |
| `npm run db:bootstrap` | Задать реальные пароли ролей БД (после миграций) |
| `npm run seed` | Демо-данные |
| `node scripts/gen-icons.mjs` | Перегенерировать PWA-иконки |
| `.\start.ps1` | Быстрый старт (Windows) — БД + `npm run dev`, см. «Локальная разработка» |
| `.\start-fresh.ps1` | Старт с нуля (Windows) — сетап + Next.js + ngrok + Telegram-вебхук |

## Архитектура (кратко)
- **Мультитенантность — Postgres RLS** (ADR-0006). Доступ к tenant-таблицам ТОЛЬКО через
  `forTenant(osiId, fn)` (`src/lib/db/tenant.ts`): транзакция + `SET LOCAL app.current_osi_id`.
  Identity-таблицы (`osi/users/sessions/user_osi_role/otp_challenge`) — вне RLS.
- **PgBouncer** (transaction pooling) для горизонтального масштабирования (NFR-020). Приложение —
  `DATABASE_URL` (app_login, `pgbouncer=true`); миграции — `DIRECT_URL` (суперпользователь).
- **Auth** (ADR-0005): самописные сессии (opaque токен в cookie, sha256-хеш в БД), OTP с
  rate-limit по номеру и IP (NFR-054), пароли — scrypt.
- **PWA**: `@ducanh2912/next-pwa`, оффлайн-фолбэк `/~offline`, manifest `/manifest.webmanifest`.

## Структура
```
src/app/            — страницы и route handlers (App Router)
src/lib/db/         — prisma-клиент + forTenant (RLS)
src/lib/auth/       — сессии, OTP, пароли, guards, rate-limit
src/lib/onboarding/ — сервис ОСИ/дом/квартира/житель (через forTenant)
prisma/             — schema.prisma + миграции (init, rls_policies, auth)
tests/integration/  — RLS + онбординг (на реальной БД)
e2e/                — Playwright (вход по OTP)
docker/nginx/       — Nginx (HTTPS-терминация, self-signed → Let's Encrypt)
scripts/            — db-bootstrap, seed, gen-icons
```

## Продакшн: HTTPS через Let's Encrypt
`docker/nginx/` в dev генерит self-signed сертификат. Для прода:
1. Направьте домен на сервер, откройте 80/443.
2. Получите сертификат (certbot) в том `nginx_certs` вместо `self.crt/self.key`
   (ACME-challenge отдаётся из `/.well-known/acme-challenge/`, location уже настроен).
3. Замените `CN=localhost` на ваш домен; перезапустите nginx.

Все секреты (`POSTGRES_PASSWORD`, `APP_DB_PASSWORD`, `APP_SUPERADMIN_PASSWORD`) в проде —
сильные, из секрет-хранилища, НЕ из репозитория (NFR-053).

## Статус
Готово и покрыто тестами (unit + integration + e2e, всё зелёное):
- **Срез 1** — скелет + инфра, `docker compose up` (HTTPS), RLS доказан integration-тестом.
- **Срез 2** — auth: телефон+OTP (rate-limit), пароль председателя, самописные сессии; e2e входа.
- **Срез 3** — онбординг ОСИ→дом→квартира→житель (UI + API через forTenant); e2e онбординга.
- **Срез 4** — коммуникация: объявления + прочтения, заявки + статусы + тред, инфо-раздел; e2e
  (объявление→прочтение, заявка→смена статуса).
- **Срез 5** — кабинет жителя (профиль, привязка к квартире, реквизиты через инфо-раздел) + PWA
  (manifest, service worker, оффлайн-фолбэк `/~offline`, иконки, устанавливается, HTTPS).

Осталось (следующие шаги): **push-уведомления** (VAPID + PushSubscription + обработчик в SW);
прогон **Lighthouse** (в Lighthouse 12 отдельной PWA-категории больше нет — критерии
installability выполнены); `git init` + пуш, чтобы **CI** (`.github/workflows/ci.yml`) отработал;
`/code-review` + `/security-review` перед мержем; учёт/начисления/автоотчёт — **Фаза 2**.
