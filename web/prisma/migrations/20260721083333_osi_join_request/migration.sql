-- CreateEnum
CREATE TYPE "JoinRequestStatus" AS ENUM ('PENDING', 'RESOLVED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'OSI_JOIN_REQUEST';

-- CreateTable
CREATE TABLE "osi_join_request" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "note" TEXT,
    "status" "JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "osi_join_request_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "osi_join_request_osi_id_status_idx" ON "osi_join_request"("osi_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "osi_join_request_user_id_osi_id_key" ON "osi_join_request"("user_id", "osi_id");

-- AddForeignKey
ALTER TABLE "osi_join_request" ADD CONSTRAINT "osi_join_request_osi_id_fkey" FOREIGN KEY ("osi_id") REFERENCES "osi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "osi_join_request" ADD CONSTRAINT "osi_join_request_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
