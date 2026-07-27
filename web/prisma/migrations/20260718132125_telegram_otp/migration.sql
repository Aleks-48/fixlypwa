-- AlterEnum
ALTER TYPE "OtpChannel" ADD VALUE 'TELEGRAM';

-- CreateTable
CREATE TABLE "telegram_link" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "chat_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_link_phone_key" ON "telegram_link"("phone");
