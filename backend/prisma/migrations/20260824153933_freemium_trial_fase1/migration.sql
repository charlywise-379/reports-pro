-- Add freeReportUsedAt to User model
ALTER TABLE "users" ADD COLUMN "freeReportUsedAt" TIMESTAMP(3);

-- Add isTeaser to Report model with default false
ALTER TABLE "reports" ADD COLUMN "isTeaser" BOOLEAN NOT NULL DEFAULT false;

-- Make trialEndsAt nullable in Subscription model
ALTER TABLE "subscriptions" ALTER COLUMN "trialEndsAt" DROP NOT NULL;
