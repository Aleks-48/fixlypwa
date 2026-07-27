-- CreateEnum
CREATE TYPE "DocumentCategory" AS ENUM ('GOV_REGULATION', 'REPORT', 'PROTOCOL', 'CONTRACT', 'TECHNICAL', 'OTHER');

-- CreateTable
CREATE TABLE "document" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "category" "DocumentCategory" NOT NULL DEFAULT 'OTHER',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "file_url" TEXT NOT NULL,
    "file_size" INTEGER,
    "file_type" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT true,
    "author_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "document_osi_id_idx" ON "document"("osi_id");

-- CreateIndex
CREATE INDEX "document_building_id_idx" ON "document"("building_id");

-- CreateIndex
CREATE INDEX "document_category_idx" ON "document"("category");

-- AddForeignKey
ALTER TABLE "document" ADD CONSTRAINT "document_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS Policy for document table (ADR-0006)
ALTER TABLE "document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "document" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON "document"
  USING      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  WITH CHECK (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);

