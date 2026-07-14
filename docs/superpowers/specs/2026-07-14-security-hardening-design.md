# Security Hardening — Diseño

**Fecha:** 2026-07-14
**Origen:** hallazgos de `OmniReports-Auditoria-Tecnica.pdf` y `OmniReports-Seguridad-RLS.pdf`
**Rama:** `fix/security-hardening` (desde `main`) → un solo PR al finalizar todos los bloques

## Contexto

Dos auditorías previas (arquitectura y seguridad/RLS) identificaron hallazgos críticos y advertencias sobre el backend de OmniReports (Express + Prisma + BullMQ) y el frontend (Next.js). Hoy todo el desarrollo ocurre con commits directos a `main`, y `main` se despliega directo a producción (Railway + Vercel) sin entorno intermedio.

Este documento define el plan para corregir los puntos más importantes de ambas auditorías, agrupados en una sola rama de trabajo con un único PR, sin interrumpir el servicio en producción durante el desarrollo (los cambios solo se activan al mergear).

## Estrategia de ramas

- Una rama única: `fix/security-hardening`, creada desde `main` actualizado.
- Todo el trabajo de este plan se commitea ahí, en bloques (ver abajo), cada uno probado localmente antes de avanzar al siguiente.
- Un solo Pull Request a `main` al finalizar, para revisión antes de mergear.
- Este enfoque se eligió sobre alternativas de "una rama por hallazgo" (más trazabilidad pero más overhead de gestión, no justificado para un equipo pequeño) y "rama de staging permanente" (requiere un segundo entorno en Railway/Vercel que no existe hoy).

## Fuera de alcance (explícitamente)

- **Rotación de secretos reales** (BLESS_KEY en Browserless, o cualquier otra credencial) — el código se prepara para no depender de un fallback hardcodeado, pero la rotación en el proveedor y la actualización de la variable de entorno en Railway las ejecuta el usuario manualmente, fuera de este plan, cuando decida.
- Adopción de `zod` para validar los bodies de las rutas (`onboarding.ts`, `stripe.ts`, `reports.ts`).
- Limitar los campos expuestos por `GET /api/dashboard/:userId` (hoy reenvía `additionalContext` completo).

Estos dos últimos puntos quedan documentados como trabajo futuro, no bloquean nada urgente hoy.

## Bloques de trabajo

### Bloque 1 — Cerrar accesos sin auth y CORS

Cambios que solo restringen acceso; no tienen forma de romper un flujo que hoy funciona correctamente, porque todo lo que hacían las rutas para un usuario legítimo sigue permitido.

1. **`GET /download/:filename` sin autenticación** (`backend/src/routes/reports.ts:189-204`)
   Agregar `requireAuth` + verificación de ownership (comparar `report.project.userId` contra `req.userId`), replicando el patrón ya usado en `GET /signed-url/:reportId` en el mismo archivo.

2. **CORS sin restricción de origen** (`backend/src/index.ts:18`)
   Cambiar `app.use(cors())` por `app.use(cors({ origin: process.env.FRONTEND_URL }))`.

3. **Payload completo en logs** (`backend/src/routes/onboarding.ts:10`)
   Eliminar el `console.log('📦 PAYLOAD RECIBIDO:', ...)` que vuelca el body completo (incluye teléfono y email de entrega) a los logs de producción.

4. **Fallback hardcodeado de `BLESS_KEY`** (`backend/src/lib/reportEngine.ts:1359`)
   Reemplazar `process.env.BLESS_KEY || '<key-literal>'` por una validación que lance error explícito si la variable de entorno no está definida, eliminando el literal del código fuente. No se rota la key como parte de este bloque.

### Bloque 2 — Consolidar código repetido

Reduce duplicación que hoy genera inconsistencias silenciosas (documentadas en la auditoría de arquitectura: 3 tablas de horas de frecuencia con valores distintos, 2 mapas de precios de Stripe idénticos, 5 checks de ownership copiados a mano).

5. **Middleware `requireProjectOwnership`**
   Nuevo middleware en `backend/src/middleware/` que recibe el nombre del parámetro de ruta (`projectId` o `userId` según el caso), carga el recurso, y compara ownership una sola vez. Reemplaza los checks manuales en `dashboard.ts:11`, `reports.ts:21/132/169` y `onboarding.ts:380`.

6. **Constante única de horas mínimas por frecuencia**
   Extraer `{ DAILY, WEEKLY, BIWEEKLY, MONTHLY }` a un módulo compartido (p. ej. `backend/src/lib/frequency.ts`) e importarlo en `scheduleReports.ts`, `reportWorker.ts` y `routes/reports.ts`, eliminando las 3 copias con valores ligeramente distintos.

7. **Mapa de precios de Stripe unificado**
   Reusar `PLANS` (ya definido en `backend/src/lib/stripe.ts`) en `routes/stripe.ts`, eliminando las dos copias literales del mapeo `priceId → monto MXN` (webhook y `verify-session`).

8. **Unificar generación manual y por cola**
   `POST /api/reports/generate/:projectId` (`routes/reports.ts`) deja de ejecutar el pipeline completo inline y en su lugar encola un job en `reportQueue`, igual que hace el scheduler. Esto elimina la posibilidad de que el mismo proyecto genere dos reportes en paralelo (uno manual, uno programado) sin coordinación entre sí.

### Bloque 3 — Row Level Security

Cambio de esquema de base de datos. Se ejecuta al final porque tiene la mayor superficie de "algo puede salir mal" si una política queda mal escrita, y porque no mitiga ningún riesgo activo hoy (el backend usa Prisma con conexión `service_role`, que bypassa RLS siempre) — es una red de seguridad para el futuro, no una corrección de un bug actual.

9. **Migración Prisma**
   Nueva migración SQL que habilita `ENABLE ROW LEVEL SECURITY` en las 9 tablas (`users`, `projects`, `reports`, `subscriptions`, `competitive_intelligence_setups`, `corporate_health_setups`, `cybersecurity_setups`, `report_access_logs`, `audit_logs`) y define políticas que restringen lectura/escritura por `user_id` (directo en `users`/`projects`/`subscriptions`, o vía `project_id` → `projects.user_id` en las tablas dependientes), usando `auth.uid()` de Supabase.

10. **Validación end-to-end con RLS activo**
    Correr el flujo completo localmente (onboarding → generación de reporte → dashboard) contra la base de datos con las políticas ya aplicadas, confirmando que el backend (que usa `service_role`, exento de RLS) sigue funcionando exactamente igual. Esto es la prueba de que el cambio es puramente una red de seguridad adicional, no una regresión funcional.

## Validación antes de abrir el PR

- Cada bloque se prueba localmente antes de pasar al siguiente (no se acumulan cambios sin verificar).
- Bloque 1 y 2: pruebas manuales de los flujos afectados (login → generar reporte → descargar PDF vía `/signed-url` y confirmar que `/download` directo ahora exige auth; onboarding completo; webhook de Stripe con Stripe CLI en modo test si está disponible).
- Bloque 3: flujo completo end-to-end con RLS habilitado en un proyecto de Supabase de prueba (no en el de producción), antes de incluir la migración en el PR.
- El merge a `main` es la única acción que afecta producción; hasta ese momento todo el trabajo vive aislado en la rama.
