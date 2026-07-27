-- Auth v2: email как канал OTP (auth-email.md, ревизия ADR-0005, REQ-005..008).
-- 1) otp_challenge.phone → identifier (телефон или email) + канал доставки.
-- 2) users.phone / occupant.phone — опциональны (email-only аккаунты, приглашение по почте).

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('SMS', 'EMAIL');

-- AlterTable: otp_challenge
ALTER TABLE "otp_challenge" RENAME COLUMN "phone" TO "identifier";
ALTER TABLE "otp_challenge" ADD COLUMN "channel" "OtpChannel" NOT NULL DEFAULT 'SMS';

-- RenameIndex (индекс по phone создавался Prisma как otp_challenge_phone_idx)
ALTER INDEX "otp_challenge_phone_idx" RENAME TO "otp_challenge_identifier_idx";

-- AlterTable: users.phone → nullable (unique сохраняется, NULL-ы не конфликтуют)
ALTER TABLE "users" ALTER COLUMN "phone" DROP NOT NULL;

-- AlterTable: occupant.phone → nullable
ALTER TABLE "occupant" ALTER COLUMN "phone" DROP NOT NULL;
