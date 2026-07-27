-- CreateEnum
CREATE TYPE "AssistantRole" AS ENUM ('USER', 'ASSISTANT');

-- CreateTable
CREATE TABLE "assistant_conversation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT,
    "pseudonym_map" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assistant_conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assistant_message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "role" "AssistantRole" NOT NULL,
    "content" TEXT NOT NULL,
    "tool_calls" JSONB,
    "tokens_in" INTEGER,
    "tokens_out" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assistant_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assistant_conversation_osi_id_user_id_idx" ON "assistant_conversation"("osi_id", "user_id");

-- CreateIndex
CREATE INDEX "assistant_message_osi_id_idx" ON "assistant_message"("osi_id");

-- CreateIndex
CREATE INDEX "assistant_message_conversation_id_idx" ON "assistant_message"("conversation_id");

-- AddForeignKey
ALTER TABLE "assistant_conversation" ADD CONSTRAINT "assistant_conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assistant_message" ADD CONSTRAINT "assistant_message_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "assistant_conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RLS (ADR-0006): обе таблицы несут osi_id — tenant-таблицы, изолируются тем же паттерном,
-- что остальные (20260701120000_rls_policies/20260702050402_notifications).
ALTER TABLE "assistant_conversation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistant_conversation" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON "assistant_conversation"
  USING      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  WITH CHECK (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);

ALTER TABLE "assistant_message" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "assistant_message" FORCE  ROW LEVEL SECURITY;
CREATE POLICY tenant_iso ON "assistant_message"
  USING      (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid)
  WITH CHECK (osi_id = nullif(current_setting('app.current_osi_id', true), '')::uuid);
