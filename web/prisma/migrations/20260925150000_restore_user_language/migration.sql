-- TECH-013: repair installations whose recorded settings migration lacks this column.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "language" VARCHAR(5) NOT NULL DEFAULT 'ru';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'users' AND column_name = 'lang'
  ) THEN
    EXECUTE 'UPDATE "users" SET "language" = "lang" WHERE "lang" IN (''ru'', ''kk'', ''en'')';
  END IF;
END $$;
