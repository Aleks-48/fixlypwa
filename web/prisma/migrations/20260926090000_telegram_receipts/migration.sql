CREATE TABLE "telegram_update_receipt" (
  "id" INTEGER PRIMARY KEY,
  "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
GRANT SELECT, INSERT, UPDATE, DELETE ON "telegram_update_receipt" TO app_login, app_superadmin;
