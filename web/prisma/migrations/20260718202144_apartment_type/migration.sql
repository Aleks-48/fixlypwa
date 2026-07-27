-- CreateEnum
CREATE TYPE "ApartmentType" AS ENUM ('RESIDENTIAL', 'NON_RESIDENTIAL', 'PARKING', 'STORAGE');

-- AlterTable
ALTER TABLE "apartment" ADD COLUMN     "type" "ApartmentType";
