-- Métricas calculadas de cada reporte; el siguiente reporte del proyecto compara contra ellas.
ALTER TABLE "reports" ADD COLUMN "metricsJson" JSONB;

-- Registro de investigación (búsquedas, URLs, lecturas y cobertura) que respalda la evidencia del reporte.
ALTER TABLE "reports" ADD COLUMN "evidenceJson" JSONB;
