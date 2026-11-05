-- Solo el backend (rol postgres, BYPASSRLS) accede a las tablas de public.
-- El frontend usa Supabase únicamente para auth, así que anon/authenticated no necesitan acceso directo.

-- 1. RLS activo en todas las tablas de public (idempotente).
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;
END $$;

-- 2. Eliminar las políticas de "filas propias": permitían a un usuario con sesión modificar su propia
--    fila (accountType, maxProjects, freeReportUsedAt, estado de suscripción...) vía la API REST de Supabase.
DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT tablename, policyname FROM pg_policies
           WHERE schemaname = 'public' AND tablename <> '_prisma_migrations' LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, p.tablename);
  END LOOP;
END $$;

-- 3. Quitar privilegios directos a anon/authenticated (también para tablas futuras creadas por postgres).
REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES    FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated;
