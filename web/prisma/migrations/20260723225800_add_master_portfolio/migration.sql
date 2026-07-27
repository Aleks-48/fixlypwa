-- CreateTable
CREATE TABLE "master_portfolio_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "master_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" "RequestCategory" NOT NULL,
    "photo_urls" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_portfolio_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "master_portfolio_item_master_id_idx" ON "master_portfolio_item"("master_id");

-- AddForeignKey
ALTER TABLE "master_portfolio_item" ADD CONSTRAINT "master_portfolio_item_master_id_fkey" FOREIGN KEY ("master_id") REFERENCES "master"("id") ON DELETE CASCADE ON UPDATE CASCADE;
