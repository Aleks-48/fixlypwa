-- 1. Добавляем значение в Enum
ALTER TYPE "DocumentCategory" ADD VALUE IF NOT EXISTS 'ESTIMATE';

-- 2. Добавляем колонку poll_id в таблицу document
ALTER TABLE IF EXISTS "document"
  ADD COLUMN IF NOT EXISTS "poll_id" UUID;

-- 3. Безопасно добавляем внешний ключ document -> poll
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'poll')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'document_poll_id_fkey') THEN
    ALTER TABLE "document"
      ADD CONSTRAINT "document_poll_id_fkey"
      FOREIGN KEY ("poll_id")
      REFERENCES "poll"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

-- 4. Индекс для poll_id
CREATE INDEX IF NOT EXISTS "document_poll_id_idx" ON "document"("poll_id");

-- 5. Создаём таблицу master_review, если её ещё нет
CREATE TABLE IF NOT EXISTS "master_review" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "master_id" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "photo_urls" TEXT[] NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_review_pkey" PRIMARY KEY ("id")
);

-- 6. Добавляем колонку photo_urls на случай, если таблица уже существовала
ALTER TABLE IF EXISTS "master_review"
  ADD COLUMN IF NOT EXISTS "photo_urls" TEXT[] NOT NULL DEFAULT '{}';