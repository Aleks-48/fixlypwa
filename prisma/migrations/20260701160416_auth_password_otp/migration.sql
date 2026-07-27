-- AlterTable
ALTER TABLE "users" ADD COLUMN     "password_hash" TEXT;

-- CreateTable
CREATE TABLE "otp_challenge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "request_ip" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_challenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "otp_challenge_phone_idx" ON "otp_challenge"("phone");

-- CreateIndex
CREATE INDEX "otp_challenge_created_at_idx" ON "otp_challenge"("created_at");
