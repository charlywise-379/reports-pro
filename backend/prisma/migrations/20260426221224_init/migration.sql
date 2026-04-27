-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('COMPETITIVE_INTELLIGENCE', 'CORPORATE_HEALTH', 'CYBERSECURITY_RADAR');

-- CreateEnum
CREATE TYPE "ReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "DeliveryChannel" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'UNPAID');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT,
    "avatarUrl" TEXT,
    "phone" TEXT,
    "stripeCustomerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "frequency" "ReportFrequency" NOT NULL,
    "status" "ProjectStatus" NOT NULL DEFAULT 'TRIAL',
    "deliveryChannels" "DeliveryChannel"[],
    "deliveryEmail" TEXT,
    "deliveryPhone" TEXT,
    "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "nextReportAt" TIMESTAMP(3),
    "reportSlug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitive_intelligence_setups" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT NOT NULL,
    "subIndustry" TEXT,
    "country" TEXT NOT NULL DEFAULT 'México',
    "city" TEXT,
    "mainProducts" TEXT[],
    "targetMarket" TEXT,
    "priceSegment" TEXT,
    "salesChannels" TEXT[],
    "competitor1Name" TEXT,
    "competitor1Website" TEXT,
    "competitor2Name" TEXT,
    "competitor2Website" TEXT,
    "competitor3Name" TEXT,
    "competitor3Website" TEXT,
    "competitor4Name" TEXT,
    "competitor4Website" TEXT,
    "competitor5Name" TEXT,
    "competitor5Website" TEXT,
    "linkedinUrl" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "twitterUrl" TEXT,
    "tiktokUrl" TEXT,
    "trackingKeywords" TEXT[],
    "regulatoryBodies" TEXT[],
    "geographicScope" TEXT[],
    "focusAreas" TEXT[],
    "languagePreference" TEXT NOT NULL DEFAULT 'es-MX',
    "additionalContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "competitive_intelligence_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "corporate_health_setups" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "website" TEXT,
    "industry" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'México',
    "city" TEXT,
    "employeeCount" INTEGER NOT NULL,
    "ageRangeMin" INTEGER,
    "ageRangeMax" INTEGER,
    "genderDistribution" TEXT,
    "workModality" TEXT NOT NULL,
    "shiftType" TEXT,
    "mainRoles" TEXT[],
    "mainDepartments" TEXT[],
    "highStressRoles" TEXT[],
    "existingPrograms" TEXT[],
    "mainHRChallenges" TEXT[],
    "absenteeismRate" TEXT,
    "turnoverRate" TEXT,
    "priorityTopics" TEXT[],
    "budgetRange" TEXT,
    "complianceNeeds" TEXT[],
    "languagePreference" TEXT NOT NULL DEFAULT 'es-MX',
    "additionalContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "corporate_health_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cybersecurity_setups" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "primaryDomain" TEXT NOT NULL,
    "additionalDomains" TEXT[],
    "country" TEXT NOT NULL DEFAULT 'México',
    "industry" TEXT NOT NULL,
    "hostingType" TEXT,
    "cloudProvider" TEXT,
    "cdnProvider" TEXT,
    "serverOs" TEXT,
    "cmsUsed" TEXT,
    "cmsVersion" TEXT,
    "ecommercePlugin" TEXT,
    "erpSystem" TEXT,
    "crmSystem" TEXT,
    "emailProvider" TEXT,
    "videoConf" TEXT,
    "activeTools" TEXT[],
    "handlesPersonalData" BOOLEAN NOT NULL DEFAULT false,
    "handlesPCI" BOOLEAN NOT NULL DEFAULT false,
    "handlesHealthData" BOOLEAN NOT NULL DEFAULT false,
    "dataStorageLocation" TEXT,
    "employeeCount" INTEGER,
    "hasFirewall" BOOLEAN NOT NULL DEFAULT false,
    "hasSSL" BOOLEAN NOT NULL DEFAULT true,
    "hasMFA" BOOLEAN NOT NULL DEFAULT false,
    "hasBackups" BOOLEAN NOT NULL DEFAULT false,
    "hasIncidentResponse" BOOLEAN NOT NULL DEFAULT false,
    "lastSecurityAudit" TEXT,
    "securityCertifications" TEXT[],
    "regulatoryFrameworks" TEXT[],
    "complianceDeadlines" TEXT,
    "languagePreference" TEXT NOT NULL DEFAULT 'es-MX',
    "additionalContext" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cybersecurity_setups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePriceId" TEXT,
    "stripeCurrentPeriodEnd" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "frequency" "ReportFrequency" NOT NULL,
    "pricePerMonth" DOUBLE PRECISION NOT NULL,
    "trialStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trialEndsAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "claudeModel" TEXT,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "generationMs" INTEGER,
    "r2Key" TEXT,
    "r2Url" TEXT,
    "pdfSizeBytes" INTEGER,
    "deliveredAt" TIMESTAMP(3),
    "deliveryChannels" "DeliveryChannel"[],
    "deliveryError" TEXT,
    "reportTitle" TEXT,
    "reportPeriod" TEXT,
    "sectionsJson" JSONB,
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "sentryEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_access_logs" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "event" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_stripeCustomerId_key" ON "users"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "projects_reportSlug_key" ON "projects"("reportSlug");

-- CreateIndex
CREATE UNIQUE INDEX "competitive_intelligence_setups_projectId_key" ON "competitive_intelligence_setups"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "corporate_health_setups_projectId_key" ON "corporate_health_setups"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "cybersecurity_setups_projectId_key" ON "cybersecurity_setups"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_projectId_key" ON "subscriptions"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeSubscriptionId_key" ON "subscriptions"("stripeSubscriptionId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "competitive_intelligence_setups" ADD CONSTRAINT "competitive_intelligence_setups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "corporate_health_setups" ADD CONSTRAINT "corporate_health_setups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cybersecurity_setups" ADD CONSTRAINT "cybersecurity_setups_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
