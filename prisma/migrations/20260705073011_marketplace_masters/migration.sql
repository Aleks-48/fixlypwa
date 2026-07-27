-- CreateEnum
CREATE TYPE "MasterStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "MarketListingStatus" AS ENUM ('PUBLISHED', 'TAKEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "MarketOfferStatus" AS ENUM ('OFFERED', 'ACCEPTED', 'DECLINED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "building" ADD COLUMN     "city" TEXT NOT NULL DEFAULT 'Кокшетау';

-- CreateTable
CREATE TABLE "master" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "categories" "RequestCategory"[],
    "bio" TEXT,
    "status" "MasterStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_listing" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "photo_urls" TEXT[],
    "building_label" TEXT NOT NULL,
    "status" "MarketListingStatus" NOT NULL DEFAULT 'PUBLISHED',
    "published_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "market_listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_offer" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "master_id" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "status" "MarketOfferStatus" NOT NULL DEFAULT 'OFFERED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_offer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "master_user_id_key" ON "master"("user_id");

-- CreateIndex
CREATE INDEX "master_city_status_idx" ON "master"("city", "status");

-- CreateIndex
CREATE UNIQUE INDEX "market_listing_request_id_key" ON "market_listing"("request_id");

-- CreateIndex
CREATE INDEX "market_listing_osi_id_idx" ON "market_listing"("osi_id");

-- CreateIndex
CREATE INDEX "market_listing_city_status_idx" ON "market_listing"("city", "status");

-- CreateIndex
CREATE INDEX "market_offer_osi_id_idx" ON "market_offer"("osi_id");

-- CreateIndex
CREATE INDEX "market_offer_listing_id_idx" ON "market_offer"("listing_id");

-- CreateIndex
CREATE INDEX "market_offer_master_id_idx" ON "market_offer"("master_id");

-- CreateIndex
CREATE UNIQUE INDEX "market_offer_listing_id_master_id_key" ON "market_offer"("listing_id", "master_id");

-- AddForeignKey
ALTER TABLE "master" ADD CONSTRAINT "master_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_listing" ADD CONSTRAINT "market_listing_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer" ADD CONSTRAINT "market_offer_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "market_listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_offer" ADD CONSTRAINT "market_offer_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "master"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================ RLS для маркетплейса мастеров (ADR-0009) ============================
-- "master" — identity-таблица (мастер не состоит ни в одной ОСИ) — БЕЗ RLS, как osi/users/sessions.
--
-- "market_listing" и "market_offer" — tenant-таблицы (несут osi_id), НО, в отличие от остальных
-- tenant-таблиц, к ним применяется НЕ ОДНА generic tenant_iso политика (см. rls_policies), а ДВЕ
-- permissive-политики каждая. В Postgres несколько permissive-политик для одной команды
-- объединяются через OR — так один и тот же ряд читается по ДВУМ независимым контекстам:
--   • forTenant(osiId, ...)          → app.current_osi_id    → путь председателя (полный CRUD)
--   • forMaster(masterId, city, ...) → app.current_master_id / app.current_master_city
--                                                             → путь мастера (сильно ограниченный)
-- Контексты не пересекаются: в запросе председателя app.current_master_id/city не установлены
-- (NULL) — политика market_read/master_own молчит; в запросе мастера app.current_osi_id не
-- установлен — tenant_iso молчит. Deny-by-default сохраняется в обоих направлениях.

ALTER TABLE "market_listing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_listing" FORCE  ROW LEVEL SECURITY;

-- Председатель (forTenant): полный CRUD над листингами своей ОСИ — публикация/снятие.
CREATE POLICY tenant_iso ON "market_listing"
  USING      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  WITH CHECK (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);

-- Мастер (forMaster): ТОЛЬКО чтение опубликованного своего города. Проверка status=APPROVED —
-- на уровне приложения ДО вызова forMaster (Master вне RLS, читается обычным prisma-запросом),
-- как и активная роль председателя проверяется до forTenant (см. guards.ts).
CREATE POLICY market_read ON "market_listing"
  FOR SELECT
  USING (
    status = 'PUBLISHED'
    AND city = nullif(current_setting('app.current_master_city', true), '')
  );

ALTER TABLE "market_offer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "market_offer" FORCE  ROW LEVEL SECURITY;

-- Председатель (forTenant): видит/принимает отклики на листинги своей ОСИ.
CREATE POLICY tenant_iso ON "market_offer"
  USING      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  WITH CHECK (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);

-- Мастер (forMaster): видит/создаёт/отзывает ТОЛЬКО свои отклики (master_id = свой). Видимость
-- самого листинга на момент создания отклика проверяется сервисным кодом через market_read
-- (в той же транзакции) — RLS отклика это не гарантирует (см. ADR-0009).
CREATE POLICY master_own ON "market_offer"
  USING      (master_id = nullif(current_setting('app.current_master_id', true), '')::uuid)
  WITH CHECK (master_id = nullif(current_setting('app.current_master_id', true), '')::uuid);
