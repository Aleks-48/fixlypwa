/*
  Warnings:

  - A unique constraint covering the columns `[osi_id,bank_ref]` on the table `expense` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[osi_id,bank_ref]` on the table `payment` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "expense" ADD COLUMN     "bank_ref" TEXT;

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "bank_ref" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "expense_osi_id_bank_ref_key" ON "expense"("osi_id", "bank_ref");

-- CreateIndex
CREATE UNIQUE INDEX "payment_osi_id_bank_ref_key" ON "payment"("osi_id", "bank_ref");
