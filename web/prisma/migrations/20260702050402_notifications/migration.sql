-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ANNOUNCEMENT', 'REQUEST_CREATED', 'REQUEST_STATUS', 'REQUEST_MESSAGE');

-- CreateTable
CREATE TABLE "push_subscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "push_subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "entity_type" TEXT,
    "entity_id" UUID,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "push_subscription_endpoint_key" ON "push_subscription"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscription_user_id_idx" ON "push_subscription"("user_id");

-- CreateIndex
CREATE INDEX "notification_osi_id_idx" ON "notification"("osi_id");

-- CreateIndex
CREATE INDEX "notification_user_id_read_at_idx" ON "notification"("user_id", "read_at");

-- AddForeignKey
ALTER TABLE "push_subscription" ADD CONSTRAINT "push_subscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification" ADD CONSTRAINT "notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ============================ RLS для notification (ADR-0006) ============================
-- notification — tenant-таблица (несёт osi_id) → изолируем по тенанту, как остальные.
-- push_subscription — identity (принадлежит устройству пользователя, не ОСИ) → БЕЗ RLS,
-- доступ через app_login по дефолтным привилегиям (ALTER DEFAULT PRIVILEGES в rls_policies).
ALTER TABLE "notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notification" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON "notification"
  USING      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  WITH CHECK (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);
