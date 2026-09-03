-- CreateEnum
CREATE TYPE "PromoCodeType" AS ENUM ('STANDARD', 'FULL_ACCESS_NO_TRIAL');

-- AlterTable
ALTER TABLE "promo_codes" ADD COLUMN "type" "PromoCodeType" NOT NULL DEFAULT 'STANDARD';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "pendingPromoCode" TEXT;
