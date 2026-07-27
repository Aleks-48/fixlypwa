-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_superadmin" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "admin_audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_user_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "diff" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "admin_audit_log_actor_user_id_idx" ON "admin_audit_log"("actor_user_id");

-- CreateIndex
CREATE INDEX "admin_audit_log_action_entity_id_idx" ON "admin_audit_log"("action", "entity_id");
