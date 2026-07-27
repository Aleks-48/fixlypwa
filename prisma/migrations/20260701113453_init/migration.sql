-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'CHAIRMAN', 'RESIDENT');

-- CreateEnum
CREATE TYPE "TariffCategory" AS ENUM ('MAINTENANCE', 'TARGETED', 'CAPITAL_REPAIR');

-- CreateEnum
CREATE TYPE "RateType" AS ENUM ('PER_SQM', 'FIXED');

-- CreateEnum
CREATE TYPE "ChargeStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID');

-- CreateEnum
CREATE TYPE "IncomeCategory" AS ENUM ('RESIDENT_DUES', 'PARKING_STORAGE_DUES', 'CAPITAL_REPAIR_CONTRIBUTION', 'RENTAL_INCOME', 'TARGETED_RESIDENT', 'TARGETED_PARKING', 'OTHER_INCOME');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CURRENT', 'SAVINGS');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('LABOR_ACCOUNTING', 'LABOR_MANAGEMENT', 'BUDGET_PAYMENTS', 'BANK_SERVICES', 'CASH_SERVICE', 'OFFICE', 'SERVICE_CONTRACT', 'CURRENT_REPAIR', 'UTILITIES', 'HOUSEHOLD', 'CAPITAL_REPAIR');

-- CreateEnum
CREATE TYPE "ReportType" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'GENERATED', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELED');

-- CreateEnum
CREATE TYPE "AuditEntityType" AS ENUM ('CHARGE', 'PAYMENT', 'TARIFF', 'EXPENSE');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "AnnouncementScope" AS ENUM ('BUILDING', 'ENTRANCE', 'APARTMENT');

-- CreateEnum
CREATE TYPE "RequestCategory" AS ENUM ('PLUMBING', 'ELEVATOR', 'CLEANING', 'ELECTRICITY', 'OTHER');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'RESOLVED');

-- CreateEnum
CREATE TYPE "InfoItemType" AS ENUM ('TRASH_SCHEDULE', 'EMERGENCY_CONTACTS', 'PAYMENT_DETAILS', 'CHAIRMAN_CONTACTS', 'OTHER');

-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('DRAFT', 'IN_PROGRESS', 'CLOSED');

-- CreateTable
CREATE TABLE "osi" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "bin" VARCHAR(12),
    "address" TEXT,
    "registered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "osi_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "active_osi_id" UUID,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_osi_role" (
    "user_id" UUID NOT NULL,
    "osi_id" UUID NOT NULL,
    "role" "Role" NOT NULL,

    CONSTRAINT "user_osi_role_pkey" PRIMARY KEY ("user_id","osi_id")
);

-- CreateTable
CREATE TABLE "building" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "address" TEXT NOT NULL,
    "apartments_count" INTEGER,
    "built_year" INTEGER,

    CONSTRAINT "building_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "apartment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "number" TEXT NOT NULL,
    "area" DECIMAL(8,2),

    CONSTRAINT "apartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "account_number" TEXT,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "user_id" UUID,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "iin" TEXT,
    "ownership_share" DECIMAL(5,4),

    CONSTRAINT "owner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "occupant" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "apartment_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,

    CONSTRAINT "occupant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tariff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "category" "TariffCategory" NOT NULL,
    "rate_type" "RateType" NOT NULL,
    "rate" DECIMAL(12,2) NOT NULL,
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3),

    CONSTRAINT "tariff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "charge" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "tariff_id" UUID NOT NULL,
    "period" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "due_date" TIMESTAMP(3) NOT NULL,
    "status" "ChargeStatus" NOT NULL DEFAULT 'OPEN',

    CONSTRAINT "charge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paid_at" TIMESTAMP(3) NOT NULL,
    "method" TEXT,
    "income_category" "IncomeCategory" NOT NULL,

    CONSTRAINT "payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_account" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "type" "BankAccountType" NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "current_balance" DECIMAL(14,2),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3) NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL,
    "closing_balance" DECIMAL(14,2) NOT NULL,
    "total_income" DECIMAL(14,2) NOT NULL,
    "total_expense" DECIMAL(14,2) NOT NULL,
    "source_file_url" TEXT,
    "reconciled_at" TIMESTAMP(3),

    CONSTRAINT "bank_statement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counterparty" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "bin" TEXT,
    "type" TEXT,

    CONSTRAINT "counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "bank_account_id" UUID NOT NULL,
    "expense_category" "ExpenseCategory" NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "counterparty_id" UUID,
    "purpose" TEXT,
    "withheld_tax" DECIMAL(14,2),
    "contract_ref" TEXT,
    "is_internal_transfer" BOOLEAN NOT NULL DEFAULT false,
    "act_url" TEXT,

    CONSTRAINT "expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "type" "ReportType" NOT NULL DEFAULT 'MONTHLY',
    "period_from" TIMESTAMP(3) NOT NULL,
    "period_to" TIMESTAMP(3) NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "generated_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "accountant_name" TEXT,
    "chairman_name" TEXT,
    "house_council_name" TEXT,
    "file_url" TEXT,

    CONSTRAINT "report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "plan" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3),

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "entity_type" "AuditEntityType" NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "AuditAction" NOT NULL,
    "diff" JSONB,
    "actor_user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scope" "AnnouncementScope" NOT NULL DEFAULT 'BUILDING',
    "target_ids" TEXT[],
    "is_pinned" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcement_read" (
    "osi_id" UUID NOT NULL,
    "announcement_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "read_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_read_pkey" PRIMARY KEY ("announcement_id","user_id")
);

-- CreateTable
CREATE TABLE "request" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "apartment_id" UUID,
    "author_user_id" UUID NOT NULL,
    "category" "RequestCategory" NOT NULL,
    "text" TEXT NOT NULL,
    "photo_urls" TEXT[],
    "status" "RequestStatus" NOT NULL DEFAULT 'RECEIVED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "request_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "request_message" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "request_id" UUID NOT NULL,
    "author_user_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "request_message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "info_item" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "type" "InfoItemType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,

    CONSTRAINT "info_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "deadline" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_option" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "poll_id" UUID NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "poll_option_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vote" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "meeting" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "osi_id" UUID NOT NULL,
    "building_id" UUID NOT NULL,
    "agenda" TEXT NOT NULL,
    "quorum_requirement" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'DRAFT',
    "protocol_url" TEXT,

    CONSTRAINT "meeting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "osi_bin_key" ON "osi"("bin");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "building_osi_id_idx" ON "building"("osi_id");

-- CreateIndex
CREATE INDEX "apartment_osi_id_idx" ON "apartment"("osi_id");

-- CreateIndex
CREATE INDEX "apartment_building_id_idx" ON "apartment"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "account_apartment_id_key" ON "account"("apartment_id");

-- CreateIndex
CREATE INDEX "account_osi_id_idx" ON "account"("osi_id");

-- CreateIndex
CREATE INDEX "owner_osi_id_idx" ON "owner"("osi_id");

-- CreateIndex
CREATE INDEX "owner_apartment_id_idx" ON "owner"("apartment_id");

-- CreateIndex
CREATE UNIQUE INDEX "occupant_user_id_key" ON "occupant"("user_id");

-- CreateIndex
CREATE INDEX "occupant_osi_id_idx" ON "occupant"("osi_id");

-- CreateIndex
CREATE INDEX "occupant_apartment_id_idx" ON "occupant"("apartment_id");

-- CreateIndex
CREATE INDEX "tariff_osi_id_idx" ON "tariff"("osi_id");

-- CreateIndex
CREATE INDEX "tariff_building_id_idx" ON "tariff"("building_id");

-- CreateIndex
CREATE INDEX "charge_osi_id_idx" ON "charge"("osi_id");

-- CreateIndex
CREATE INDEX "charge_account_id_idx" ON "charge"("account_id");

-- CreateIndex
CREATE INDEX "payment_osi_id_idx" ON "payment"("osi_id");

-- CreateIndex
CREATE INDEX "payment_account_id_idx" ON "payment"("account_id");

-- CreateIndex
CREATE INDEX "bank_account_osi_id_idx" ON "bank_account"("osi_id");

-- CreateIndex
CREATE INDEX "bank_account_building_id_idx" ON "bank_account"("building_id");

-- CreateIndex
CREATE INDEX "bank_statement_osi_id_idx" ON "bank_statement"("osi_id");

-- CreateIndex
CREATE INDEX "bank_statement_bank_account_id_idx" ON "bank_statement"("bank_account_id");

-- CreateIndex
CREATE INDEX "counterparty_osi_id_idx" ON "counterparty"("osi_id");

-- CreateIndex
CREATE INDEX "expense_osi_id_idx" ON "expense"("osi_id");

-- CreateIndex
CREATE INDEX "expense_building_id_idx" ON "expense"("building_id");

-- CreateIndex
CREATE INDEX "expense_bank_account_id_idx" ON "expense"("bank_account_id");

-- CreateIndex
CREATE INDEX "report_osi_id_idx" ON "report"("osi_id");

-- CreateIndex
CREATE INDEX "report_building_id_idx" ON "report"("building_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_building_id_key" ON "subscription"("building_id");

-- CreateIndex
CREATE INDEX "subscription_osi_id_idx" ON "subscription"("osi_id");

-- CreateIndex
CREATE INDEX "audit_log_osi_id_idx" ON "audit_log"("osi_id");

-- CreateIndex
CREATE INDEX "audit_log_entity_type_entity_id_idx" ON "audit_log"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "announcement_osi_id_idx" ON "announcement"("osi_id");

-- CreateIndex
CREATE INDEX "announcement_building_id_idx" ON "announcement"("building_id");

-- CreateIndex
CREATE INDEX "announcement_read_osi_id_idx" ON "announcement_read"("osi_id");

-- CreateIndex
CREATE INDEX "request_osi_id_idx" ON "request"("osi_id");

-- CreateIndex
CREATE INDEX "request_building_id_idx" ON "request"("building_id");

-- CreateIndex
CREATE INDEX "request_status_idx" ON "request"("status");

-- CreateIndex
CREATE INDEX "request_message_osi_id_idx" ON "request_message"("osi_id");

-- CreateIndex
CREATE INDEX "request_message_request_id_idx" ON "request_message"("request_id");

-- CreateIndex
CREATE INDEX "info_item_osi_id_idx" ON "info_item"("osi_id");

-- CreateIndex
CREATE INDEX "info_item_building_id_idx" ON "info_item"("building_id");

-- CreateIndex
CREATE INDEX "poll_osi_id_idx" ON "poll"("osi_id");

-- CreateIndex
CREATE INDEX "poll_building_id_idx" ON "poll"("building_id");

-- CreateIndex
CREATE INDEX "poll_option_osi_id_idx" ON "poll_option"("osi_id");

-- CreateIndex
CREATE INDEX "vote_osi_id_idx" ON "vote"("osi_id");

-- CreateIndex
CREATE UNIQUE INDEX "vote_option_id_user_id_key" ON "vote"("option_id", "user_id");

-- CreateIndex
CREATE INDEX "meeting_osi_id_idx" ON "meeting"("osi_id");

-- CreateIndex
CREATE INDEX "meeting_building_id_idx" ON "meeting"("building_id");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_osi_role" ADD CONSTRAINT "user_osi_role_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_osi_role" ADD CONSTRAINT "user_osi_role_osi_id_fkey" FOREIGN KEY ("osi_id") REFERENCES "osi"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "building" ADD CONSTRAINT "building_osi_id_fkey" FOREIGN KEY ("osi_id") REFERENCES "osi"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartment" ADD CONSTRAINT "apartment_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owner" ADD CONSTRAINT "owner_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupant" ADD CONSTRAINT "occupant_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "occupant" ADD CONSTRAINT "occupant_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tariff" ADD CONSTRAINT "tariff_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "charge" ADD CONSTRAINT "charge_tariff_id_fkey" FOREIGN KEY ("tariff_id") REFERENCES "tariff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_account" ADD CONSTRAINT "bank_account_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statement" ADD CONSTRAINT "bank_statement_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_account"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense" ADD CONSTRAINT "expense_counterparty_id_fkey" FOREIGN KEY ("counterparty_id") REFERENCES "counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report" ADD CONSTRAINT "report_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement" ADD CONSTRAINT "announcement_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request" ADD CONSTRAINT "request_apartment_id_fkey" FOREIGN KEY ("apartment_id") REFERENCES "apartment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "request_message" ADD CONSTRAINT "request_message_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "request"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "info_item" ADD CONSTRAINT "info_item_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll" ADD CONSTRAINT "poll_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_option" ADD CONSTRAINT "poll_option_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vote" ADD CONSTRAINT "vote_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "poll_option"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "meeting" ADD CONSTRAINT "meeting_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "building"("id") ON DELETE CASCADE ON UPDATE CASCADE;
