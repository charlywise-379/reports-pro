# Security Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cerrar los hallazgos críticos de las auditorías de arquitectura y seguridad/RLS (acceso sin auth, CORS abierto, credencial hardcodeada, código duplicado con inconsistencias, ausencia de RLS) en una sola rama `fix/security-hardening`, sin afectar producción hasta el merge final.

**Architecture:** Cambios incrementales sobre el backend Express existente (`backend/src/`) — sin frameworks nuevos, sin reestructurar carpetas. Se agrega un middleware reusable, se consolidan constantes duplicadas en módulos compartidos, y se agrega una migración Prisma con SQL crudo para RLS (Prisma no soporta RLS nativamente, así que la migración usa `prisma migrate dev --create-only` + SQL manual).

**Tech Stack:** Express 5, Prisma 7 (adapter-pg), TypeScript, PostgreSQL (Supabase), sin test runner instalado — validación manual vía llamadas HTTP con `curl`/Postman y revisión de logs, documentada paso a paso en cada tarea.

## Global Constraints

- No hay carpeta de tests en el proyecto — cada tarea valida con pasos manuales explícitos (curl, revisión de respuesta HTTP, logs de consola), no con un test runner.
- `userId` nunca debe leerse de `req.body` — siempre de `req.userId` (adjuntado por `requireAuth`). Ya es el patrón existente; no cambiarlo.
- No rotar secretos reales (BLESS_KEY u otros) como parte de este plan — el código debe fallar explícito si falta la env var, pero la rotación en el proveedor la ejecuta el usuario aparte.
- `backend/.env` ya contiene los valores reales de todas las variables usadas hoy (confirmado: incluye `BLESS_KEY`, `STRIPE_PRICE_*`, etc.) — ningún cambio de este plan requiere pedir un secreto nuevo al usuario.
- Todo el trabajo ocurre en la rama `fix/security-hardening`; no se hace commit directo a `main` durante la ejecución de este plan.
- Mantener el estilo de código existente (comentarios en español donde el archivo ya los usa, `console.log` con prefijos tipo `[Worker]`/`[Scheduler]` donde aplique).

---

## Task 0: Crear la rama de trabajo

**Files:** ninguno (operación de git)

- [ ] **Step 1: Confirmar que `main` está limpio y actualizado**

Run: `git -C "D:\Trabajo\FLOW11\OmniReports" status --porcelain`
Expected: sin salida, o solo archivos ya conocidos como untracked (PDFs de auditoría, `install.ps1`) — ningún cambio a medias.

- [ ] **Step 2: Crear y cambiar a la rama**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" checkout -b fix/security-hardening
```

Expected: `Switched to a new branch 'fix/security-hardening'`

---

## Task 1: Cerrar `GET /download/:filename` sin autenticación

**Files:**
- Modify: `backend/src/routes/reports.ts:189-204`

**Interfaces:**
- Consumes: `requireAuth` middleware (ya existe en `backend/src/middleware/auth.ts`, adjunta `req.userId`), `prisma.report.findFirst`/`findUnique` (ya usados en el mismo archivo).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Leer el estado actual de la ruta**

El código actual (líneas 189-204 de `backend/src/routes/reports.ts`):

```typescript
router.get('/download/:filename', async (req: Request, res: Response) => {
  const filename = req.params.filename as string
  try {
    const report = await prisma.report.findFirst({
      where: { OR: [{ r2Key: filename }, { r2Key: 'reports/' + filename }, { r2Key: filename.replace('reports/', '') }] }
    })
    if (report?.r2Url) return res.redirect(report.r2Url)
    const filePath = path.join(__dirname, '../../outputs', filename)
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
      return fs.createReadStream(filePath).pipe(res)
    }
    return res.status(404).json({ error: 'Archivo no encontrado' })
  } catch(e: any) { return res.status(500).json({ error: e.message }) }
})
```

- [ ] **Step 2: Reemplazar con versión autenticada y con ownership check**

Reemplazar el bloque completo por:

```typescript
router.get('/download/:filename', requireAuth, async (req: Request, res: Response) => {
  const filename = req.params.filename as string
  const userId = req.userId!
  try {
    const report = await prisma.report.findFirst({
      where: { OR: [{ r2Key: filename }, { r2Key: 'reports/' + filename }, { r2Key: filename.replace('reports/', '') }] },
      include: { project: true } as any
    })
    if (!report) return res.status(404).json({ error: 'Archivo no encontrado' })
    if ((report as any).project?.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este reporte' })
    }
    if (report.r2Url) return res.redirect(report.r2Url)
    const filePath = path.join(__dirname, '../../outputs', filename)
    if (fs.existsSync(filePath)) {
      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader('Content-Disposition', 'attachment; filename="' + filename + '"')
      return fs.createReadStream(filePath).pipe(res)
    }
    return res.status(404).json({ error: 'Archivo no encontrado' })
  } catch(e: any) { return res.status(500).json({ error: e.message }) }
})
```

Nota: `requireAuth` ya está importado en este archivo (línea 5: `import { requireAuth } from '../middleware/auth'`), no se necesita agregar el import.

- [ ] **Step 3: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores de tipo relacionados a `reports.ts`.

- [ ] **Step 4: Validación manual — request sin token debe fallar**

Con el backend corriendo localmente (`pnpm dev` en `backend/`), ejecutar:

```bash
curl -i http://localhost:3001/api/reports/download/report-test-123.pdf
```

Expected: `HTTP/1.1 401` con body `{"error":"No autorizado — token requerido"}` (mensaje exacto de `requireAuth` en `middleware/auth.ts:21`).

- [ ] **Step 5: Validación manual — request con token de otro usuario debe dar 403**

Usando un token válido de un usuario que no sea dueño del reporte de prueba:

```bash
curl -i http://localhost:3001/api/reports/download/report-test-123.pdf -H "Authorization: Bearer <token_de_otro_usuario>"
```

Expected: `HTTP/1.1 403` con `{"error":"No tienes permiso para descargar este reporte"}`.

- [ ] **Step 6: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/routes/reports.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "fix: require auth and ownership check on GET /download/:filename"
```

---

## Task 2: Restringir CORS al frontend

**Files:**
- Modify: `backend/src/index.ts:18`

**Interfaces:**
- Consumes: `process.env.FRONTEND_URL` (ya definida en `backend/.env`, usada también en `routes/stripe.ts:35`).
- Produces: nada.

- [ ] **Step 1: Reemplazar la configuración de CORS**

En `backend/src/index.ts`, cambiar:

```typescript
app.use(cors())
```

por:

```typescript
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }))
```

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Validación manual — request desde origen permitido**

Con backend corriendo y `FRONTEND_URL=http://localhost:3000` en `.env`:

```bash
curl -i http://localhost:3001/health -H "Origin: http://localhost:3000"
```

Expected: header de respuesta `Access-Control-Allow-Origin: http://localhost:3000` presente.

- [ ] **Step 4: Validación manual — request desde origen no permitido**

```bash
curl -i http://localhost:3001/health -H "Origin: https://sitio-malicioso.com"
```

Expected: la respuesta NO incluye el header `Access-Control-Allow-Origin` con ese valor (el navegador bloquearía la respuesta en un contexto real; `curl` igual recibe el body pero sin el header de CORS habilitante).

- [ ] **Step 5: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/index.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "fix: restrict CORS to FRONTEND_URL instead of open origin"
```

---

## Task 3: Eliminar log de payload completo en onboarding

**Files:**
- Modify: `backend/src/routes/onboarding.ts:10`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: nada.

- [ ] **Step 1: Eliminar la línea de log**

En `backend/src/routes/onboarding.ts`, dentro de `router.post('/competitive', ...)`, eliminar la línea:

```typescript
    console.log('📦 PAYLOAD RECIBIDO:', JSON.stringify(req.body, null, 2))
```

No agregar ningún reemplazo — el resto del handler no depende de este log.

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Validación manual**

Hacer un POST de prueba a `/api/onboarding/competitive` con un token válido y confirmar en la consola del backend que ya no aparece la línea `📦 PAYLOAD RECIBIDO:` en los logs, mientras el resto del flujo (creación de proyecto) sigue funcionando igual (revisar respuesta `201` con `projectId`).

- [ ] **Step 4: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/routes/onboarding.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "fix: remove full request body logging in onboarding route"
```

---

## Task 4: Eliminar fallback hardcodeado de BLESS_KEY

**Files:**
- Modify: `backend/src/lib/reportEngine.ts:1359`

**Interfaces:**
- Consumes: `process.env.BLESS_KEY` (ya presente en `backend/.env` con el valor real).
- Produces: nada.

- [ ] **Step 1: Ubicar el uso actual**

Leer el contexto alrededor de la línea 1359 de `backend/src/lib/reportEngine.ts` (dentro de `generateReport`, sección "Generar PDF via Browserless"):

```typescript
  const BLESS = process.env.BLESS_KEY || '2USURVP56XGJ4jt3d331ba66adbe68c94b9339f6a42b53507'
```

- [ ] **Step 2: Reemplazar por validación explícita**

```typescript
  const BLESS = process.env.BLESS_KEY
  if (!BLESS) {
    throw new Error('BLESS_KEY no está configurada — no se puede generar el PDF')
  }
```

- [ ] **Step 3: Confirmar que la variable de entorno ya existe**

Run: `grep BLESS_KEY "D:\Trabajo\FLOW11\OmniReports\backend\.env"`
Expected: una línea `BLESS_KEY=2USURVP56XGJ4jt3d331ba66adbe68c94b9339f6a42b53507` — confirma que el cambio de código no rompe nada en local porque la env var sigue presente. (La rotación de esta key en Browserless queda fuera de este plan, a ejecutar por separado por el usuario.)

- [ ] **Step 4: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Validación manual — falla explícita sin la env var**

Temporalmente comentar la línea `BLESS_KEY=...` en `backend/.env`, reiniciar el backend, y disparar una generación de reporte de prueba (`POST /api/reports/generate/:projectId` con un proyecto de prueba). Confirmar en logs que el error es `Error: BLESS_KEY no está configurada — no se puede generar el PDF` y no un fallo silencioso o uso de la key vieja. Luego **restaurar la línea en `.env`** antes de continuar.

- [ ] **Step 6: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/lib/reportEngine.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "fix: remove hardcoded BLESS_KEY fallback, fail explicitly if unset"
```

---

## Task 5: Middleware `requireProjectOwnership`

**Files:**
- Create: `backend/src/middleware/ownership.ts`
- Modify: `backend/src/routes/dashboard.ts:7-13`
- Modify: `backend/src/routes/reports.ts` (rutas `/status/:projectId` y `/signed-url/:reportId`, y la nueva de Task 1)
- Modify: `backend/src/routes/onboarding.ts` (ruta `/invite`)

**Interfaces:**
- Consumes: `prisma` (de `backend/src/lib/prisma.ts`), `req.userId` (de `requireAuth`).
- Produces: `requireProjectOwnership(paramName: string, resource: 'project' | 'report')` — middleware factory exportado. Uso: `router.get('/:projectId', requireAuth, requireProjectOwnership('projectId', 'project'), handler)`. Adjunta `req.ownedResource` (el registro ya cargado de Prisma) para que el handler no tenga que volver a consultarlo.

- [ ] **Step 1: Crear el middleware**

Crear `backend/src/middleware/ownership.ts`:

```typescript
import { Request, Response, NextFunction } from 'express'
import { prisma } from '../lib/prisma'

declare global {
  namespace Express {
    interface Request {
      ownedResource?: any
    }
  }
}

type ResourceType = 'project' | 'report'

export function requireProjectOwnership(paramName: string, resource: ResourceType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = req.params[paramName]
      const userId = req.userId!

      if (resource === 'project') {
        const project = await prisma.project.findUnique({ where: { id } })
        if (!project) return res.status(404).json({ error: 'Proyecto no encontrado' })
        if ((project as any).userId !== userId) {
          return res.status(403).json({ error: 'No tienes permiso para acceder a este proyecto' })
        }
        req.ownedResource = project
        return next()
      }

      if (resource === 'report') {
        const report = await prisma.report.findUnique({
          where: { id },
          include: { project: true } as any
        })
        if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })
        if ((report as any).project?.userId !== userId) {
          return res.status(403).json({ error: 'No tienes permiso para acceder a este reporte' })
        }
        req.ownedResource = report
        return next()
      }

      return res.status(500).json({ error: 'Tipo de recurso no soportado' })
    } catch (e: any) {
      return res.status(500).json({ error: e.message })
    }
  }
}
```

- [ ] **Step 2: Verificar compilación del middleware solo**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Aplicar en `dashboard.ts`**

En `backend/src/routes/dashboard.ts`, la ruta actual:

```typescript
router.get('/:userId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { userId } = req.params

    if (userId !== req.userId) {
      return res.status(403).json({ error: 'No tienes permiso para ver este dashboard' })
    }
```

Esta ruta compara `userId` de la URL directo contra `req.userId` (no carga un `project` primero), así que **no** usa el middleware nuevo — ese caso ya es correcto y simple tal cual. No modificar esta ruta en este paso (se deja documentado por qué se excluye).

- [ ] **Step 4: Aplicar en `reports.ts` — ruta `/status/:projectId`**

En `backend/src/routes/reports.ts`, la ruta actual (aprox. línea 127):

```typescript
router.get('/status/:projectId', requireAuth, async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string
    const userId = req.userId!
    const project = await prisma.project.findUnique({ where: { id: projectId } })
    if (!project || (project as any).userId !== userId) {
      return res.status(403).json({ error: 'No autorizado' })
    }
```

Reemplazar por:

```typescript
router.get('/status/:projectId', requireAuth, requireProjectOwnership('projectId', 'project'), async (req: Request, res: Response) => {
  try {
    const projectId = req.params.projectId as string
```

(el resto del handler sigue igual — ya no necesita recargar `project` porque solo lo usaba para el check, que ahora hace el middleware).

- [ ] **Step 5: Aplicar en `reports.ts` — ruta `/signed-url/:reportId`**

La ruta actual (aprox. línea 157):

```typescript
router.get('/signed-url/:reportId', requireAuth, async (req: Request, res: Response) => {
  try {
    const reportId = req.params.reportId as string
    const userId = req.userId!

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: { project: true } as any
    })

    if (!report) return res.status(404).json({ error: 'Reporte no encontrado' })

    if ((report as any).project?.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para descargar este reporte' })
    }

    if (!report.r2Key) return res.status(404).json({ error: 'PDF no disponible' })
```

Reemplazar por:

```typescript
router.get('/signed-url/:reportId', requireAuth, requireProjectOwnership('reportId', 'report'), async (req: Request, res: Response) => {
  try {
    const report = req.ownedResource

    if (!report.r2Key) return res.status(404).json({ error: 'PDF no disponible' })
```

- [ ] **Step 6: Aplicar en la ruta `/download/:filename` de Task 1**

Actualizar la ruta creada en Task 1 para usar el middleware. Como esta ruta busca el reporte por `r2Key` (no por `id`) antes de saber si existe, el middleware no puede aplicarse directo en la firma de la ruta (necesita el `id` del reporte, no el filename). Dejar la ruta de Task 1 tal cual quedó (con el chequeo manual inline) — es la única ruta de este bloque que no encaja en el patrón del middleware porque el parámetro de la URL no es un ID. Documentar esto como excepción intencional, no como pendiente.

- [ ] **Step 7: Aplicar en `onboarding.ts` — ruta `/invite`**

La ruta actual (aprox. línea 370):

```typescript
router.post('/invite', requireAuth, async (req: Request, res: Response) => {
  try {
    const { projectId, emails } = req.body
    const userId = req.userId!

    if (!projectId || !emails?.length) {
      return res.status(400).json({ error: 'projectId y emails requeridos' })
    }

    const project = await (prisma.project as any).findUnique({ where: { id: projectId } })
    if (!project || project.userId !== userId) {
      return res.status(403).json({ error: 'No tienes permiso' })
    }
```

Esta ruta recibe `projectId` en el **body**, no en un parámetro de ruta (`req.params`) — el middleware `requireProjectOwnership` como está escrito solo lee `req.params`. No modificar esta ruta en este paso; queda documentado que el middleware cubre casos con `:id` en la URL, no en el body. El chequeo manual existente aquí ya es correcto y se deja igual.

- [ ] **Step 8: Agregar imports necesarios**

En `backend/src/routes/reports.ts`, agregar al inicio del archivo (junto a los demás imports):

```typescript
import { requireProjectOwnership } from '../middleware/ownership'
```

- [ ] **Step 9: Verificar compilación completa**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 10: Validación manual**

Repetir las pruebas de Step 4 y 5 de Task 1 (401 sin token, 403 con token de otro usuario) contra `GET /api/reports/status/:projectId` y `GET /api/reports/signed-url/:reportId`, confirmando que el comportamiento de status codes no cambió respecto a antes del refactor.

- [ ] **Step 11: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/middleware/ownership.ts backend/src/routes/reports.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "refactor: extract requireProjectOwnership middleware, apply to reports routes"
```

---

## Task 6: Constante única de horas mínimas por frecuencia

**Files:**
- Create: `backend/src/lib/frequency.ts`
- Modify: `backend/src/jobs/scheduleReports.ts:39-41`
- Modify: `backend/src/workers/reportWorker.ts:42-44`
- Modify: `backend/src/routes/reports.ts:45-47`

**Interfaces:**
- Consumes: nada.
- Produces: `MIN_HOURS_BY_FREQUENCY: Record<string, number>` — objeto exportado con las 4 claves `DAILY`, `WEEKLY`, `BIWEEKLY`, `MONTHLY`. Valor de verdad elegido: `{ DAILY: 22, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720 }` (los valores usados por `scheduleReports.ts` y `routes/reports.ts`, más permisivos que los de `reportWorker.ts`; se usa este set porque es el que ve el usuario primero al intentar generar manualmente vía `routes/reports.ts`, y porque el scheduler ya lo usa como fuente de la cadencia programada).

- [ ] **Step 1: Crear el módulo compartido**

Crear `backend/src/lib/frequency.ts`:

```typescript
export const MIN_HOURS_BY_FREQUENCY: Record<string, number> = {
  DAILY: 22,
  WEEKLY: 168,
  BIWEEKLY: 336,
  MONTHLY: 720,
}
```

- [ ] **Step 2: Actualizar `scheduleReports.ts`**

En `backend/src/jobs/scheduleReports.ts`, agregar el import junto a los existentes:

```typescript
import { MIN_HOURS_BY_FREQUENCY } from '../lib/frequency'
```

Y reemplazar (líneas 39-41):

```typescript
    const frecuencyHours: Record<string, number> = {
      DAILY: 22, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720
    }
```

por:

```typescript
    const frecuencyHours = MIN_HOURS_BY_FREQUENCY
```

- [ ] **Step 3: Actualizar `reportWorker.ts`**

En `backend/src/workers/reportWorker.ts`, agregar el import junto a los existentes:

```typescript
import { MIN_HOURS_BY_FREQUENCY } from '../lib/frequency'
```

Y reemplazar (líneas 42-44):

```typescript
        const frecuencyHours: Record<string, number> = {
          DAILY: 22, WEEKLY: 160, BIWEEKLY: 330, MONTHLY: 710
        }
```

por:

```typescript
        const frecuencyHours = MIN_HOURS_BY_FREQUENCY
```

Nota: esto cambia el comportamiento del worker (antes usaba 160/330/710h, ahora usará 168/336/720h) — es la corrección intencional del hallazgo de la auditoría, no un efecto secundario a evitar.

- [ ] **Step 4: Actualizar `routes/reports.ts`**

En `backend/src/routes/reports.ts`, agregar el import junto a los existentes:

```typescript
import { MIN_HOURS_BY_FREQUENCY } from '../lib/frequency'
```

Y reemplazar (líneas 45-47):

```typescript
      const frecuencyHours: Record<string, number> = {
        DAILY: 22, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720
      }
```

por:

```typescript
      const frecuencyHours = MIN_HOURS_BY_FREQUENCY
```

- [ ] **Step 5: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 6: Validación manual**

Buscar y confirmar que ya no quedan tablas duplicadas:

Run: `grep -rn "DAILY: 22" "D:\Trabajo\FLOW11\OmniReports\backend\src"`
Expected: cero resultados (todas las referencias ahora pasan por `MIN_HOURS_BY_FREQUENCY`, que no contiene el string literal `"DAILY: 22"` con ese formato exacto — solo aparece una vez, en `frequency.ts`).

- [ ] **Step 7: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/lib/frequency.ts backend/src/jobs/scheduleReports.ts backend/src/workers/reportWorker.ts backend/src/routes/reports.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "refactor: unify minimum-hours-by-frequency table into shared module"
```

---

## Task 7: Unificar mapa de precios de Stripe

**Files:**
- Create: `backend/src/lib/stripePriceMap.ts`
- Modify: `backend/src/routes/stripe.ts:88-97,247`

**Interfaces:**
- Consumes: `process.env.STRIPE_PRICE_DAILY`, `STRIPE_PRICE_WEEKLY`, `STRIPE_PRICE_BIWEEKLY`, `STRIPE_PRICE_MONTHLY`, `STRIPE_PRICE_DAILY_ANNUAL`, `STRIPE_PRICE_WEEKLY_ANNUAL`, `STRIPE_PRICE_BIWEEKLY_ANNUAL`, `STRIPE_PRICE_MONTHLY_ANNUAL` (las 8 variables ya presentes en `backend/.env`, confirmadas en la reubicación de secretos).
- Produces: `getPriceAmountMXN(priceId: string): number` — función exportada que devuelve el monto en MXN para un `priceId` dado, o `49` como fallback si no coincide con ninguna variable conocida.

**Nota de diseño importante:** El objeto `PLANS` existente en `backend/src/lib/stripe.ts` usa un catálogo de price IDs distinto (`price_1TUzq...`, precios en USD) al que realmente usa el webhook (`price_1TbA...`, precios en MXN, que coinciden con las variables `STRIPE_PRICE_*` de `.env`). Reusar `PLANS` tal cual introduciría un bug — los IDs no coincidirían nunca y el fallback de `49` se activaría siempre. La corrección real es construir el mapa desde las variables de entorno `STRIPE_PRICE_*`, que sí son la fuente de verdad vigente. No modificar `lib/stripe.ts` en esta tarea (queda fuera de alcance — su corrección, si aplica, es un hallazgo nuevo a evaluar aparte).

- [ ] **Step 1: Crear el módulo compartido**

Crear `backend/src/lib/stripePriceMap.ts`:

```typescript
const PRICE_TO_AMOUNT_MXN: Record<string, number> = {}

function register(envVar: string | undefined, amount: number) {
  if (envVar) PRICE_TO_AMOUNT_MXN[envVar] = amount
}

register(process.env.STRIPE_PRICE_DAILY, 29.99)
register(process.env.STRIPE_PRICE_WEEKLY, 25.00)
register(process.env.STRIPE_PRICE_BIWEEKLY, 22.00)
register(process.env.STRIPE_PRICE_MONTHLY, 20.00)
register(process.env.STRIPE_PRICE_DAILY_ANNUAL, 29.99)
register(process.env.STRIPE_PRICE_WEEKLY_ANNUAL, 25.00)
register(process.env.STRIPE_PRICE_BIWEEKLY_ANNUAL, 22.00)
register(process.env.STRIPE_PRICE_MONTHLY_ANNUAL, 20.00)

export function getPriceAmountMXN(priceId: string | undefined | null): number {
  if (!priceId) return 49
  return PRICE_TO_AMOUNT_MXN[priceId] ?? 49
}
```

Nota: los montos (29.99, 25.00, 22.00, 20.00) se toman de `backend/src/lib/stripe.ts` (los valores por frecuencia ya definidos ahí para `PLANS.monthly.*.price`), no de los montos hardcodeados en `routes/stripe.ts` (49/79/99/149/...) — esos últimos no tienen una fuente documentada de por qué esos valores específicos corresponden a esos price IDs, así que se preserva el precio base conocido y confiable en vez de inventar una correspondencia.

- [ ] **Step 2: Actualizar el webhook `checkout.session.completed`**

En `backend/src/routes/stripe.ts`, agregar el import junto a los existentes:

```typescript
import { getPriceAmountMXN } from '../lib/stripePriceMap'
```

Reemplazar (líneas 87-97):

```typescript
        const priceId = sub.items.data[0].price.id
        const priceMap: Record<string,number> = {
          "price_1TbAByRmWEBJMGXdUCjaNSAN": 49,
          "price_1TbABzRmWEBJMGXdVRxXDOra": 79,
          "price_1TbAC0RmWEBJMGXdVhvlncr9": 99,
          "price_1TbAC0RmWEBJMGXd1khQ2wEJ": 149,
          "price_1TbAC1RmWEBJMGXdTUOqMqN0": 39.2,
          "price_1TbAC2RmWEBJMGXdpyYqw4xR": 63.2,
          "price_1TbAC2RmWEBJMGXdA7AvWUtG": 79.2,
          "price_1TbAC3RmWEBJMGXd4F7SbDYw": 119.2
        }
```

por:

```typescript
        const priceId = sub.items.data[0].price.id
```

Y más abajo, donde se usa `priceMap[priceId] || 49` (dos ocurrencias, en `create` y `update` del `upsert`), reemplazar por `getPriceAmountMXN(priceId)`.

- [ ] **Step 3: Actualizar la ruta `verify-session`**

Reemplazar (línea 247):

```typescript
        pricePerMonth: ({"price_1TbAByRmWEBJMGXdUCjaNSAN":49,"price_1TbABzRmWEBJMGXdVRxXDOra":79,"price_1TbAC0RmWEBJMGXdVhvlncr9":99,"price_1TbAC0RmWEBJMGXd1khQ2wEJ":149,"price_1TbAC1RmWEBJMGXdTUOqMqN0":39.2,"price_1TbAC2RmWEBJMGXdpyYqw4xR":63.2,"price_1TbAC2RmWEBJMGXdA7AvWUtG":79.2,"price_1TbAC3RmWEBJMGXd4F7SbDYw":119.2} as Record<string,number>)[sub.items?.data[0]?.price?.id] || 49.00,
```

por:

```typescript
        pricePerMonth: getPriceAmountMXN(sub.items?.data[0]?.price?.id),
```

- [ ] **Step 4: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Validación manual**

Run: `grep -n "price_1TbA" "D:\Trabajo\FLOW11\OmniReports\backend\src\routes\stripe.ts"`
Expected: cero resultados — ya no quedan price IDs hardcodeados en este archivo.

Si es posible probar con Stripe CLI en modo test (`stripe listen --forward-to localhost:3001/api/stripe/webhook` + `stripe trigger checkout.session.completed`), confirmar que el campo `pricePerMonth` en la tabla `subscriptions` se llena con un valor distinto de `49` (el fallback) cuando el price ID de prueba coincide con alguna de las variables `STRIPE_PRICE_*`. Si Stripe CLI no está disponible, documentar esta validación como pendiente de correr antes del merge.

- [ ] **Step 6: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/lib/stripePriceMap.ts backend/src/routes/stripe.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "refactor: unify Stripe price-to-amount map, derive from env vars instead of hardcoded IDs"
```

---

## Task 8: Unificar generación manual y por cola

**Files:**
- Modify: `backend/src/routes/reports.ts:11-112`

**Interfaces:**
- Consumes: `reportQueue` (de `backend/src/lib/queue.ts`, ya usado por `scheduleReports.ts`), `ReportJobData` type (mismo archivo).
- Produces: nada que otras tareas consuman.

**Contexto:** hoy `POST /generate/:projectId` ejecuta todo el pipeline de generación inline (crea el registro, llama a `generateReport`, sube a R2, envía email/WhatsApp), duplicando exactamente lo que hace `reportWorker.ts` al consumir de la cola. Si el scheduler encola un job para un proyecto justo cuando el usuario dispara la generación manual, ambos caminos corren en paralelo sin coordinarse. La corrección: la ruta HTTP debe encolar un job igual que el scheduler, y devolver de inmediato que el job fue aceptado — el resultado real (PDF listo) se consulta después vía `GET /status/:projectId`, que el frontend ya usa (confirmado: `dashboard/page.tsx` ya hace polling de `/api/dashboard/:userId` para detectar reportes `COMPLETED`).

- [ ] **Step 1: Leer el estado actual completo de la ruta**

Confirmar que `backend/src/routes/reports.ts` líneas 11-112 contienen: validaciones de ownership/trial/frecuencia/anti-duplicado (líneas 11-62, **se conservan tal cual**), seguidas de la ejecución inline del pipeline (líneas 64-111, **esto es lo que se reemplaza**).

- [ ] **Step 2: Agregar el import de la cola**

Al inicio de `backend/src/routes/reports.ts`, agregar junto a los demás imports:

```typescript
import { reportQueue } from '../lib/queue'
```

- [ ] **Step 3: Reemplazar la ejecución inline por encolado**

Reemplazar el bloque completo desde `const outputDir = ...` (línea 64) hasta el `res.status(200).json(...)` final (línea 107), es decir todo lo que sigue después de los checks de `hayGenerando` (línea 60-62) y antes del `catch` (línea 108):

Código actual a eliminar (líneas 64-107):

```typescript
    const outputDir = path.join(__dirname, '../../outputs')
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true })
    const filename = 'report-' + projectId + '-' + Date.now() + '.pdf'
    const outputPath = path.join(outputDir, filename)
    const reportRecord = await prisma.report.create({
      data: { projectId, status: 'GENERATING' as any, r2Key: 'reports/' + filename }
    })
    const projectWithSetup = { ...project, setup: (project as any).competitiveSetup, reportId: reportRecord.id }
    await generateReport(projectWithSetup, outputPath)
    const signedUrl = await uploadPDFToR2(outputPath, filename)
    await prisma.report.update({
      where: { id: reportRecord.id },
      data: { status: 'COMPLETED' as any, pdfSizeBytes: fs.statSync(outputPath).size, r2Key: 'reports/' + filename, r2Url: signedUrl }
    })
    if (!fs.existsSync(outputPath)) throw new Error('El PDF no se genero correctamente')
    const fileSize = fs.statSync(outputPath).size
    try {
      const setup = (project as any).competitiveSetup
      const companyName = setup?.companyName || 'Tu empresa'
      const reportCount = await prisma.report.count({ where: { projectId, status: 'COMPLETED' as any } })

      if (project.deliveryEmail) {
        const { sendReportEmail } = await import('../lib/email')
        // Obtener CC emails de colegas invitados
        const setupForCC = (project as any).competitiveSetup
        let ccEmails: string[] = []
        try {
          const ctx = setupForCC?.additionalContext
            ? (typeof setupForCC.additionalContext === 'string' ? JSON.parse(setupForCC.additionalContext) : setupForCC.additionalContext)
            : {}
          ccEmails = ctx.ccEmails || []
        } catch(e) {}
        await sendReportEmail(project.deliveryEmail, companyName, signedUrl, reportCount, reportCount, ccEmails)
      }

      const deliveryPhone = (project as any).deliveryPhone
      const deliveryChannels = (project as any).deliveryChannels || []
      if (deliveryPhone && deliveryChannels.includes('WHATSAPP')) {
        const { sendReportWhatsApp } = await import('../lib/whatsapp')
        await sendReportWhatsApp(deliveryPhone, companyName, signedUrl, reportCount)
        console.log('[WhatsApp] Reporte enviado a ' + deliveryPhone)
      }
    } catch(emailErr: any) { console.error('Error enviando notificaciones:', emailErr.message) }
    res.status(200).json({ success: true, message: 'Reporte generado correctamente', filename, fileSize: Math.round(fileSize / 1024) + 'KB' })
```

Reemplazar por:

```typescript
    const jobId = 'manual-' + projectId + '-' + Date.now()
    await reportQueue.add(
      'generate-report',
      { projectId, userId, trigger: 'manual' },
      { jobId }
    )
    res.status(202).json({ success: true, message: 'Reporte encolado — se generará en los próximos minutos' })
```

- [ ] **Step 4: Eliminar imports que ya no se usan en este handler**

Revisar si `generateReport`, `uploadPDFToR2`, `path`, `fs` siguen usándose en otras rutas del mismo archivo (`/download/:filename` sigue usando `path` y `fs`; `generateReport` y `uploadPDFToR2` puede que ya no se usen en ningún otro lado del archivo). Ejecutar:

Run: `grep -n "generateReport\|uploadPDFToR2" "D:\Trabajo\FLOW11\OmniReports\backend\src\routes\reports.ts"`

Si `generateReport` y `uploadPDFToR2` ya no aparecen fuera de la línea de `import`, eliminar esos dos imports específicos (dejar `path` y `fs` porque `/download/:filename` los sigue usando).

- [ ] **Step 5: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores. Si aparecen errores de imports no usados, corregir según el resultado del Step 4.

- [ ] **Step 6: Validación manual — la generación manual ahora encola en vez de bloquear**

Con backend y worker corriendo localmente (`pnpm dev` levanta ambos según `index.ts`), disparar:

```bash
curl -i -X POST http://localhost:3001/api/reports/generate/<projectId_de_prueba> -H "Authorization: Bearer <token_valido>"
```

Expected: respuesta inmediata `HTTP/1.1 202` con `{"success":true,"message":"Reporte encolado — se generará en los próximos minutos"}` — ya no espera a que termine la generación completa (que antes tomaba varios minutos por la llamada a Claude).

- [ ] **Step 7: Validación manual — el worker efectivamente procesa el job**

Revisar los logs del backend después del Step 6 y confirmar que aparecen las líneas de `reportWorker.ts` (`[Worker] Procesando job ... — trigger: manual`), y que minutos después el reporte pasa a `COMPLETED` (verificable con `GET /api/reports/status/:projectId`).

- [ ] **Step 8: Validación manual — anti-duplicado sigue funcionando**

Disparar dos requests seguidos al mismo `POST /generate/:projectId` sin esperar a que termine el primero. Expected: el segundo debe recibir `429` con `{"error":"generating", ...}` (este check, en las líneas 56-62 del archivo, no se tocó y debe seguir funcionando igual porque sigue corriendo antes del encolado).

- [ ] **Step 9: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/routes/reports.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "fix: enqueue manual report generation instead of running pipeline inline, avoiding duplicate generation with scheduler"
```

---

## Task 9: Migración RLS

**Files:**
- Create: `backend/prisma/migrations/<timestamp>_enable_rls/migration.sql` (el timestamp lo genera Prisma al correr el comando)

**Interfaces:**
- Consumes: `backend/prisma/schema.prisma` (ya existente, define las 9 tablas).
- Produces: nada que código TypeScript consuma directamente — es una migración de base de datos pura.

**Contexto:** el backend usa `service_role` vía `DATABASE_URL`/`DIRECT_URL` (confirmado en `backend/prisma.config.ts`), rol que bypassa RLS siempre en Postgres/Supabase. Esta migración no cambia el comportamiento del backend — es una red de seguridad para cualquier acceso futuro que use un rol distinto (`authenticated`, `anon`).

- [ ] **Step 1: Generar el esqueleto de la migración sin aplicarla**

Run:
```bash
cd "D:\Trabajo\FLOW11\OmniReports\backend"
npx prisma migrate dev --create-only --name enable_rls
```

Expected: crea una carpeta nueva `backend/prisma/migrations/<timestamp>_enable_rls/migration.sql`, vacía o con un comentario, sin aplicarla a la base de datos todavía.

- [ ] **Step 2: Escribir el SQL de la migración**

Reemplazar el contenido del archivo `migration.sql` generado con:

```sql
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
```

- [ ] **Step 3: Aplicar la migración en local**

Run:
```bash
cd "D:\Trabajo\FLOW11\OmniReports\backend"
npx prisma migrate dev
```

Expected: la migración se aplica sin error contra la base configurada en `DIRECT_URL` (revisar que `backend/.env` apunta a un proyecto de Supabase de prueba, no al de producción, antes de correr este comando — si `backend/.env` ya apunta a producción, detener aquí y usar una base de datos de prueba separada para este paso).

- [ ] **Step 4: Validación — el backend sigue funcionando igual con RLS activo**

Con la migración aplicada, correr el flujo completo local:
1. `POST /api/onboarding/competitive` (crear proyecto) — Expected: `201`, igual que antes.
2. `GET /api/dashboard/:userId` — Expected: devuelve el proyecto recién creado, igual que antes.
3. `POST /api/reports/generate/:projectId` (de Task 8) — Expected: `202`, encola correctamente.

Si cualquiera de estos pasos falla con un error de permisos de Postgres, significa que la conexión de Prisma no está usando `service_role` como se esperaba — revisar `DIRECT_URL` en `backend/.env` antes de continuar (no se debe modificar la migración para "arreglar" esto; el problema estaría en la configuración de conexión, no en las políticas).

- [ ] **Step 5: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/prisma/migrations
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "feat: enable Row Level Security with per-user policies on all tables"
```

---

## Task 10: Abrir el Pull Request

**Files:** ninguno (operación de git/GitHub)

- [ ] **Step 1: Push de la rama**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" push -u origin fix/security-hardening
```

- [ ] **Step 2: Confirmar el estado final antes de abrir el PR**

Run: `git -C "D:\Trabajo\FLOW11\OmniReports" log main..fix/security-hardening --oneline`
Expected: 9 commits (Tasks 1-9), cada uno con mensaje descriptivo, ninguno vacío.

- [ ] **Step 3: Abrir el PR (requiere confirmación del usuario antes de ejecutar)**

Este paso queda pendiente de aprobación explícita del usuario antes de ejecutarse — no se abre el PR automáticamente al completar Task 9. Cuando el usuario confirme, usar `gh pr create` (si `gh` está instalado) o crear el PR manualmente en GitHub con un resumen que liste los 9 cambios y el punto de partida (las dos auditorías) para el revisor.
