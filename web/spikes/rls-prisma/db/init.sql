-- Спайк ADR-0006 — схема БД.
-- Выполняется как суперпользователь postgres (docker-entrypoint), поэтому seed ниже
-- обходит RLS (суперпользователь всегда bypass). Приложение ходит как app_login (обычная роль)
-- и RLS на него действует.

-- ================= Identity-таблицы (БЕЗ RLS) — риск №1: bootstrapping =================
-- Их нужно читать ДО того, как известен osi_id (сессия → пользователь → его ОСИ),
-- поэтому они принципиально вне tenant-политик.
create table osi (
  id   uuid primary key default gen_random_uuid(),
  name text not null
);

create table users (
  id    uuid primary key default gen_random_uuid(),
  phone text unique not null
);

create table user_osi_role (
  user_id uuid not null references users(id),
  osi_id  uuid not null references osi(id),
  role    text not null,
  primary key (user_id, osi_id)
);

-- ================= Tenant-таблицы (С RLS) =================
create table building (
  id      uuid primary key default gen_random_uuid(),
  osi_id  uuid not null references osi(id),
  address text not null
);

create table charge (
  id          uuid primary key default gen_random_uuid(),
  osi_id      uuid not null references osi(id),
  building_id uuid not null references building(id),
  amount      numeric(12,2) not null
);

-- ================= Роль приложения (подчиняется RLS) =================
create role app_login login password 'app_pass';
grant usage on schema public to app_login;
grant select, insert, update, delete on all tables in schema public to app_login;

-- ================= RLS-политики по osi_id =================
-- current_setting('app.current_osi_id', true) → NULL, если контекст не установлен.
-- nullif(...,'') защищает от пустой строки. Если контекста нет → сравнение с NULL →
-- строки НЕ видны (DENY BY DEFAULT), а не «все строки».
alter table building enable row level security;
alter table building force  row level security;
create policy tenant_iso on building
  using      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  with check (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);

alter table charge enable row level security;
alter table charge force  row level security;
create policy tenant_iso on charge
  using      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  with check (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);

-- ================= Seed (2 тенанта) =================
insert into osi (id, name) values
  ('11111111-1111-1111-1111-111111111111', 'ОСИ Альфа'),
  ('22222222-2222-2222-2222-222222222222', 'ОСИ Бета');

insert into users (id, phone) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '+77010000001');

-- один председатель состоит в двух ОСИ (модель Q-011)
insert into user_osi_role (user_id, osi_id, role) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'chairman'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'chairman');

insert into building (id, osi_id, address) values
  ('b1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Альфа, Абая 1'),
  ('b2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Бета, Пушкина 2');

insert into charge (osi_id, building_id, amount) values
  ('11111111-1111-1111-1111-111111111111', 'b1111111-1111-1111-1111-111111111111', 15000.00),
  ('22222222-2222-2222-2222-222222222222', 'b2222222-2222-2222-2222-222222222222', 22000.00);
