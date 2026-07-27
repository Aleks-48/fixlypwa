-- RLS-политики мультитенантности (ADR-0006). Паттерн подтверждён спайком spikes/rls-prisma/.
--
-- Изолируем ВСЕ tenant-таблицы (несут osi_id), кроме identity-таблиц (osi, users, sessions,
-- user_osi_role) — они вне RLS по bootstrapping-причине: сессия → пользователь → его osi
-- отрабатывает до того, как известен osi_id (ADR-0006, ревизия).
--
-- Контекст устанавливается приложением на каждый запрос через forTenant():
--   SELECT set_config('app.current_osi_id', $1, true)  -- true = SET LOCAL, только в транзакции
-- Без контекста политика сравнивает osi_id с NULL → 0 строк (DENY BY DEFAULT), не "все строки".

-- ============================ Роль приложения ============================
-- Обычная роль (не суперпользователь, не владелец таблиц, без BYPASSRLS) — иначе RLS
-- обходится автоматически. Пароль — плейсхолдер, заменяется секретом деплоя (.env, не в репо).
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_login') THEN
    CREATE ROLE app_login LOGIN PASSWORD 'CHANGE_ME_IN_DEPLOY';
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_login;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_login;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_login;

-- ============================ RLS-политики по osi_id ============================
-- Для каждой tenant-таблицы: ENABLE (включает RLS) + FORCE (действует и на владельца
-- таблицы, если приложение вдруг подключится не через app_login) + политика USING/WITH CHECK.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'building', 'apartment', 'account', 'owner', 'occupant', 'tariff', 'charge', 'payment',
    'bank_account', 'bank_statement', 'counterparty', 'expense', 'report', 'subscription',
    'audit_log', 'announcement', 'announcement_read', 'request', 'request_message',
    'info_item', 'poll', 'poll_option', 'vote', 'meeting'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY tenant_iso ON %I
         USING      (osi_id = nullif(current_setting(''app.current_osi_id'', true), '''')::uuid)
         WITH CHECK (osi_id = nullif(current_setting(''app.current_osi_id'', true), '''')::uuid)',
      t
    );
  END LOOP;
END
$$;

-- ============================ SuperAdmin bypass (кросс-тенантные операции) ============================
-- Отдельная роль БД в обход RLS — используется только в явно помеченных административных
-- путях приложения (не в обычном forTenant()-потоке). BYPASSRLS даёт полный доступ ко всем
-- тенантам — обращаться с этой ролью так же осторожно, как с суперпользователем БД.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'app_superadmin') THEN
    CREATE ROLE app_superadmin LOGIN PASSWORD 'CHANGE_ME_IN_DEPLOY' BYPASSRLS;
  END IF;
END
$$;

GRANT USAGE ON SCHEMA public TO app_superadmin;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_superadmin;
