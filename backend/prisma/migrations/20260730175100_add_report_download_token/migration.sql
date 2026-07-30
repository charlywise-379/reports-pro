-- AlterTable: agregar downloadToken a reports (paso 1: nullable)
ALTER TABLE "reports" ADD COLUMN "downloadToken" TEXT;

-- Backfill: cada fila existente recibe un valor unico
-- (Prisma genera cuid() para filas nuevas vía el cliente; aqui usamos
-- gen_random_uuid() solo para poblar las filas ya existentes)
UPDATE "reports" SET "downloadToken" = gen_random_uuid()::text WHERE "downloadToken" IS NULL;

-- AlterTable: paso 2, requerir NOT NULL ahora que todas las filas tienen valor
ALTER TABLE "reports" ALTER COLUMN "downloadToken" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "reports_downloadToken_key" ON "reports"("downloadToken");
