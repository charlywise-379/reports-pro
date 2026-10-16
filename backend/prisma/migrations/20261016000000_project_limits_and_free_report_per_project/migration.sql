-- Límite de empresas por usuario y reporte gratis por empresa.
ALTER TABLE "users" ADD COLUMN "maxProjects" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "projects" ADD COLUMN "freeReportUsedAt" TIMESTAMP(3);

-- Los usuarios que ya usaron su reporte gratis: su(s) proyecto(s) existente(s) quedan marcados como usados.
UPDATE "projects" p
SET "freeReportUsedAt" = u."freeReportUsedAt"
FROM "users" u
WHERE p."userId" = u.id AND u."freeReportUsedAt" IS NOT NULL;
