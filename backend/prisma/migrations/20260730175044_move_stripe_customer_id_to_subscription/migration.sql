-- AlterTable: mover stripeCustomerId de users a subscriptions
-- (0 filas de users tenian stripeCustomerId poblado al momento de esta migracion)

-- DropIndex
DROP INDEX IF EXISTS "users_stripeCustomerId_key";

-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "stripeCustomerId";

-- AlterTable
ALTER TABLE "subscriptions" ADD COLUMN "stripeCustomerId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_stripeCustomerId_key" ON "subscriptions"("stripeCustomerId");
