-- AlterTable
ALTER TABLE "request_message" ADD COLUMN     "audio_url" TEXT,
ADD COLUMN     "image_url" TEXT;

-- CreateTable
CREATE TABLE "fcm_token" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fcm_token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fcm_token_token_key" ON "fcm_token"("token");

-- CreateIndex
CREATE INDEX "fcm_token_user_id_idx" ON "fcm_token"("user_id");

-- AddForeignKey
ALTER TABLE "fcm_token" ADD CONSTRAINT "fcm_token_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
