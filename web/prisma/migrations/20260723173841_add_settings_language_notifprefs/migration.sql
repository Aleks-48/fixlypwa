-- AlterTable
ALTER TABLE "users" ADD COLUMN     "language" VARCHAR(5) NOT NULL DEFAULT 'ru';

-- CreateTable
CREATE TABLE "notification_preference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "announcements" BOOLEAN NOT NULL DEFAULT true,
    "request_updates" BOOLEAN NOT NULL DEFAULT true,
    "charges" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notification_preference_osi_id_idx" ON "notification_preference"("osi_id");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preference_osi_id_user_id_key" ON "notification_preference"("osi_id", "user_id");

-- AddForeignKey
ALTER TABLE "notification_preference" ADD CONSTRAINT "notification_preference_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
