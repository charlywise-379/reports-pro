-- Habilita RLS en las 9 tablas del esquema.
-- El backend usa una conexión service_role (ver backend/prisma.config.ts),
-- que Postgres/Supabase exime de RLS por diseño — estas políticas son una
-- red de seguridad para cualquier acceso futuro con un rol distinto
-- (authenticated, anon), no un cambio de comportamiento para el backend actual.

ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "competitive_intelligence_setups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "corporate_health_setups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "cybersecurity_setups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "report_access_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;

-- users: cada usuario solo ve/edita su propia fila
CREATE POLICY "users_own_row" ON "users"
  FOR ALL
  USING (id = auth.uid()::text)
  WITH CHECK (id = auth.uid()::text);

-- projects: acceso directo por userId
CREATE POLICY "projects_own_rows" ON "projects"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- subscriptions: acceso directo por userId
CREATE POLICY "subscriptions_own_rows" ON "subscriptions"
  FOR ALL
  USING ("userId" = auth.uid()::text)
  WITH CHECK ("userId" = auth.uid()::text);

-- reports: acceso vía projectId -> projects.userId
CREATE POLICY "reports_own_rows" ON "reports"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "reports"."projectId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "reports"."projectId" AND p."userId" = auth.uid()::text
  ));

-- competitive_intelligence_setups: acceso vía projectId -> projects.userId
CREATE POLICY "competitive_setup_own_rows" ON "competitive_intelligence_setups"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "competitive_intelligence_setups"."projectId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "competitive_intelligence_setups"."projectId" AND p."userId" = auth.uid()::text
  ));

-- corporate_health_setups: acceso vía projectId -> projects.userId
CREATE POLICY "corporate_health_setup_own_rows" ON "corporate_health_setups"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "corporate_health_setups"."projectId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "corporate_health_setups"."projectId" AND p."userId" = auth.uid()::text
  ));

-- cybersecurity_setups: acceso vía projectId -> projects.userId
CREATE POLICY "cybersecurity_setup_own_rows" ON "cybersecurity_setups"
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "cybersecurity_setups"."projectId" AND p."userId" = auth.uid()::text
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM "projects" p WHERE p.id = "cybersecurity_setups"."projectId" AND p."userId" = auth.uid()::text
  ));

-- report_access_logs: sin userId directo ni projectId -> projects; solo el backend
-- (service_role) debe leer/escribir esta tabla — ninguna política de usuario final.
-- RLS habilitado sin políticas de usuario = deniega todo acceso salvo service_role.

-- audit_logs: mismo criterio que report_access_logs — tabla interna de auditoría,
-- sin política de usuario final. RLS habilitado sin políticas = solo service_role.
