-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('STANDARD', 'PARTNER');

-- CreateEnum
CREATE TYPE "PartnerAgency" AS ENUM ('BVRO', 'FLOW11');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accountType" "AccountType" NOT NULL DEFAULT 'STANDARD',
ADD COLUMN     "mailchimpSyncedAt" TIMESTAMP(3),
ADD COLUMN     "mailchimpTrialTaggedAt" TIMESTAMP(3),
ADD COLUMN     "partnerAgency" "PartnerAgency",
ADD COLUMN     "partnerCodeUsed" TEXT;

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN     "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "renewalReminderPeriodEnd" TIMESTAMP(3),
ADD COLUMN     "renewalReminderSentAt" TIMESTAMP(3);
