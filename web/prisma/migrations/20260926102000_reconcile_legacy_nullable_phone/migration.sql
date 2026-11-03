-- ACCEPT-004: legacy database had phone NOT NULL despite email-only login.
-- Additive reconciliation; preserves all users and complaints.
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;
ALTER TABLE "ikomek_complaint" ALTER COLUMN "photo_urls" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "updated_at" SET DEFAULT CURRENT_TIMESTAMP;
