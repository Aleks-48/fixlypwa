# Fixly — управление ОСИ (Кокшетау)

B2B2C SaaS для ОСИ: председатель управляет домом, жители видят начисления и отчёты.
Монорепо (с 2026-07-19):

| Папка | Что | Как запустить |
|---|---|---|
| [`web/`](web/README.md) | Сайт: Next.js + Prisma + Postgres (docker-compose) | `cd web && npm install && docker compose up -d postgres pgbouncer && npm run dev` |
| `app/` | Мобильное приложение: Flutter (Android/iOS/web) | `cd app && flutter run` |
| `docs/` | Спеки, ADR, требования (SDD) — общие на оба клиента | читать `docs/README.md` |

Подробности запуска сайта — [web/README.md](web/README.md). Деплой — [docs/deploy.md](docs/deploy.md).
Процесс разработки (спека → код) и правила — [CLAUDE.md](CLAUDE.md).

История: сайт разрабатывался в этом репозитории с нуля; Flutter-приложение влито из
отдельного репозитория `fixly` через git subtree (история коммитов сохранена).
