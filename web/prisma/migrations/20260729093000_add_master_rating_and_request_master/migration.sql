-- AddMasterRatingAndRequestMaster
-- Добавляет поля рейтинга в master и назначение мастера в request

-- 1. Поля рейтинга в master
ALTER TABLE "master"
  ADD COLUMN IF NOT EXISTS "rating" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
  ADD COLUMN IF NOT EXISTS "reviews_count" INTEGER NOT NULL DEFAULT 0;

-- 2. Назначение мастера в request (FK с onDelete=SetNull)
ALTER TABLE "request"
  ADD COLUMN IF NOT EXISTS "master_id" UUID;

ALTER TABLE "request"
  ADD CONSTRAINT "request_master_id_fkey"
  FOREIGN KEY ("master_id")
  REFERENCES "master"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "request_master_id_idx" ON "request"("master_id");
