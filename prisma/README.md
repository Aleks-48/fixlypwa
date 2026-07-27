# Prisma — модель данных

`schema.prisma` — единый источник модели данных (CLAUDE.md). Реализует домен, описанный в
`docs/specs/domain-model.md`, `docs/specs/report-spec.md`, `docs/specs/bank-import.md`,
`docs/specs/features.md` (Тир 1: Фазы 1–2).

## Структура миграций
- `20260701113453_init` — таблицы (сгенерировано из schema.prisma).
- `20260701120000_rls_policies` — RLS-политики поверх миграции (ADR-0006). Написана вручную
  raw SQL, паттерн подтверждён спайком `spikes/rls-prisma/`.

## Identity vs Tenant (ADR-0006)
- **Вне RLS** (bootstrapping): `Osi`, `User`, `Session`, `UserOsiRole`.
- **Под RLS** (несут `osiId`, изолируются по тенанту): все остальные 24 таблицы.

## Как это использовать в коде приложения
Любой доступ к tenant-таблицам — только через обёртку `forTenant(osiId, fn)`
(паттерн см. `spikes/rls-prisma/src/tenant.ts`; в `/app` появится финальная версия при
реализации бэкенда):

```ts
await forTenant(session.activeOsiId, (tx) => tx.building.findMany());
```

Без обёртки RLS отдаст 0 строк (DENY BY DEFAULT), а не «все строки» — так и задумано.

## Роли БД (создаются миграцией RLS)
- `app_login` — обычная роль приложения, подчиняется RLS. Из под неё работает весь обычный
  трафик (через PgBouncer, transaction pooling).
- `app_superadmin` — `BYPASSRLS`, только для явно помеченных кросс-тенантных админ-путей.
  Обращаться с той же осторожностью, что и с суперпользователем БД.

⚠️ Пароли ролей в миграции — плейсхолдеры (`CHANGE_ME_IN_DEPLOY`), заменяются секретами
деплоя, не хранить реальные пароли в репозитории.

## Команды
```bash
npm install
npx prisma generate        # сгенерировать клиент
npx prisma migrate deploy  # применить миграции (прод/staging)
npx prisma migrate dev     # применить + создать новую миграцию (только локально, dev-БД)
```

`migrate dev` **не должен** трогать RLS-миграцию автоматически — она raw SQL, Prisma не умеет
диффать политики. Новые модели → `prisma migrate dev --create-only`, затем вручную добавить
`ALTER TABLE ... ENABLE/FORCE ROW LEVEL SECURITY` + `CREATE POLICY` для новых tenant-таблиц в
той же или новой миграции.

## Не покрыто в этой схеме (осознанно)
- **Тир 2** (легитимные голосования `Meeting`, госверификация) — заготовка минимальна.
  Реализация flow — Фаза 3, зависит от ADR-0007 (партнёрство с аккредитованным оператором).
- Хеши сессий, OTP-коды и т.п. — логика приложения (ADR-0005), не часть схемы данных.
