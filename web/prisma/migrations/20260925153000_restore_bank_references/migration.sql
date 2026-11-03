-- TECH-014: restore bank import fields without discarding existing records.
ALTER TABLE "payment" ADD COLUMN IF NOT EXISTS "bank_ref" TEXT;
ALTER TABLE "expense" ADD COLUMN IF NOT EXISTS "bank_ref" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "payment_osi_id_bank_ref_key" ON "payment"("osi_id", "bank_ref");
CREATE UNIQUE INDEX IF NOT EXISTS "expense_osi_id_bank_ref_key" ON "expense"("osi_id", "bank_ref");
