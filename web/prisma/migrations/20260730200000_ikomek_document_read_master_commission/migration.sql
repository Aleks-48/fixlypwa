-- Migration: ikomek_document_read_master_commission

-- 1. Commission rate for Master (3% default)
ALTER TABLE "master" ADD COLUMN IF NOT EXISTS "commission_rate" NUMERIC(4, 3) NOT NULL DEFAULT 0.030;

-- 2. DocumentRead tracking
CREATE TABLE IF NOT EXISTS "document_read" (
    "osi_id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_read_pkey" PRIMARY KEY ("document_id","user_id"),
    CONSTRAINT "document_read_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "document"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "document_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "document_read_osi_id_idx" ON "document_read"("osi_id");

-- 3. iKomek 109 Complaints
CREATE TYPE "IKomekCategory" AS ENUM ('HEATING', 'WATER_SUPPLY', 'YARD', 'GARBAGE', 'LIGHTING', 'OTHER');
CREATE TYPE "IKomekStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'RESOLVED');

CREATE TABLE IF NOT EXISTS "ikomek_complaint" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "apartment_id" UUID,
    "author_user_id" UUID NOT NULL,
    "category" "IKomekCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "photo_urls" TEXT[] NOT NULL DEFAULT '{}',
    "status" "IKomekStatus" NOT NULL DEFAULT 'PENDING',
    "ticket_number" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ikomek_complaint_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "ikomek_complaint_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ikomek_complaint_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ikomek_complaint_author_user_id_fkey" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ikomek_complaint_osi_id_idx" ON "ikomek_complaint"("osi_id");
CREATE INDEX IF NOT EXISTS "ikomek_complaint_building_id_idx" ON "ikomek_complaint"("building_id");
CREATE INDEX IF NOT EXISTS "ikomek_complaint_author_user_id_idx" ON "ikomek_complaint"("author_user_id");
