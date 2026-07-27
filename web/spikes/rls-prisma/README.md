# Спайк: RLS + Prisma + PgBouncer (проверка ADR-0006)

Цель — доказать, что мультитенантность через Postgres RLS работает с Prisma **и** через
PgBouncer в режиме `transaction` (реальный прод-сценарий NFR-020), и снять три риска,
отмеченные в `docs/adr/ADR-0006-multitenancy.md`.

## Что проверяем (три риска ADR-0006)
1. **Bootstrapping** — таблицы идентичности (`osi`, `users`, `user_osi_role`) читаются БЕЗ
   tenant-контекста (они вне RLS), т.е. цепочка «сессия → пользователь → его ОСИ» отрабатывает
   до того, как известен `osi_id`.
2. **`SET LOCAL` в транзакции** — каждый доступ к tenant-таблицам обёрнут в одну интерактивную
   транзакцию с `set_config('app.current_osi_id', …, is_local=true)`. Без обёртки → 0 строк
   (DENY BY DEFAULT).
3. **PgBouncer transaction pooling** — приложение ходит только через PgBouncer :6432; контекст не
   протекает между клиентами (сбрасывается на COMMIT), `pgbouncer=true` в URL.

## Как запустить
```bash
docker compose up -d          # postgres + pgbouncer
npm install
npx prisma generate
npm run spike                 # запускает src/spike.ts
docker compose down -v        # очистка
```

## Результат (2026-07-01) — ВСЕ 9 ПРОВЕРОК ПРОЙДЕНЫ ✅
```
✅ Риск №1 bootstrapping: osi/user_osi_role читаются без контекста (вне RLS)
✅ Deny-by-default: building без контекста → 0 строк
✅ Изоляция: контекст «Альфа»/«Бета» видит только свои дома
✅ Изоляция: наборы тенантов не пересекаются
✅ Изоляция распространяется на charge
✅ WITH CHECK: запись с чужим osi_id заблокирована
✅ Легитимная запись в своём тенанте разрешена
✅ После вставки запись не протекла в другой тенант
ИТОГ: механизм ADR-0006 работает через PgBouncer
```

## Что это даёт для schema.prisma (переносим в прод)
- Таблицы идентичности (`osi`, `users`, `sessions`, `user_osi_role`) — **вне RLS**.
- Tenant-таблицы — `ENABLE` + `FORCE ROW LEVEL SECURITY`, политика `USING` + `WITH CHECK` по
  `osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid`.
- Приложение подключается **обычной ролью** (не суперпользователь, не владелец таблиц, без
  `BYPASSRLS`) — иначе RLS обходится.
- Обёртка `forTenant(osiId, fn)` (`src/tenant.ts`): `$transaction` + `set_config(..., is_local=true)`.
- Подключение через PgBouncer `transaction` + `?pgbouncer=true`.
- SuperAdmin / кросс-тенантные операции — отдельная роль/путь в обход RLS (в спайке не тестировалось).

## Файлы
- `docker-compose.yml` — postgres + pgbouncer (transaction)
- `db/init.sql` — схема, RLS-политики, seed
- `prisma/schema.prisma` — модели (маппинг на существующие таблицы)
- `src/tenant.ts` — обёртка `forTenant` (ядро паттерна)
- `src/spike.ts` — сценарии-проверки
