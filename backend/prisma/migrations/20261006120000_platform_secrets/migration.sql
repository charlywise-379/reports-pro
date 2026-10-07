-- CreateEnum
CREATE TYPE "SecretAuditAction" AS ENUM ('SET', 'REVERT', 'TEST');

-- CreateTable
CREATE TABLE "platform_secrets" (
    "key" TEXT NOT NULL,
    "ciphertext" TEXT NOT NULL,
    "updatedById" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_secrets_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "secret_audit_logs" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "action" "SecretAuditAction" NOT NULL,
    "adminId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "secret_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "secret_audit_logs_createdAt_idx" ON "secret_audit_logs"("createdAt");
