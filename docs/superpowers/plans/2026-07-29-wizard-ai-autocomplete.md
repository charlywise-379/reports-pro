# Wizard AI Autocomplete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un botón de autocompletado asistido por IA al wizard de onboarding — en el step de empresa y por fila de competidor directo — que busca en la web real (vía Claude + web_search) y llena solo los campos vacíos.

**Architecture:** Un endpoint backend nuevo (`POST /api/onboarding/autocomplete`) respaldado por una función en `lib/` que llama a Claude con la tool de búsqueda web, siguiendo el patrón ya establecido en `reportEngine.ts`. El frontend agrega un botón por punto de entrada (empresa, cada fila de competidor) que llama a ese endpoint y aplica el resultado con merge "solo campos vacíos".

**Tech Stack:** Express, `@anthropic-ai/sdk` (ya en uso), `express-rate-limit` (ya en uso), React state en `frontend/app/onboarding/page.tsx` (sin librería de estado nueva).

## Global Constraints

- El botón de autocompletar se habilita solo cuando nombre Y sitio web tienen contenido (tanto para empresa como por fila de competidor).
- La IA solo llena campos vacíos — nunca sobreescribe un campo que el usuario ya llenó a mano.
- Límite de 8 autocompletados por sesión de wizard (frontend) + 20 req/hora por IP (backend, respaldo).
- Sin reintento automático en el backend — si Claude falla, falla, y se reporta al frontend.
- Timeout de 25s en la llamada a Claude; el usuario nunca debe esperar indefinidamente.
- No hay test runner en el proyecto — toda validación es manual (`tsc --noEmit`, `curl`, prueba en navegador contra el entorno de staging local ya configurado: backend en `localhost:3001`, frontend en `localhost:3000`, Supabase de staging).
- `userId` nunca se lee de `req.body` en rutas autenticadas — se mantiene el patrón existente de `requireAuth` + `req.userId`.

---

## Task 1: Función de autocompletado en el backend

**Files:**
- Create: `backend/src/lib/onboardingAutocomplete.ts`

**Interfaces:**
- Consumes: `Anthropic` SDK (ya importado en `reportEngine.ts` como referencia de patrón), `process.env.ANTHROPIC_API_KEY`.
- Produces: `autocompleteCompanyInfo(nombre: string, sitioWeb: string, tipo: 'company' | 'competitor'): Promise<AutocompleteResult>` donde:
  ```typescript
  type AutocompleteResult = {
    instagram?: string
    facebook?: string
    twitter?: string
    linkedin?: string
    tiktok?: string
    industria?: string   // solo tipo 'company'
    pitch?: string        // solo tipo 'company'
    productos?: string    // solo tipo 'competitor'
    amenazaEstimada?: number  // solo tipo 'competitor', 1-10
  }
  ```
  Lanza `Error` con mensaje descriptivo si Claude falla, hace timeout, o el JSON no es parseable — el llamador (la ruta) decide el status HTTP.

- [ ] **Step 1: Crear el archivo con la función principal**

Crear `backend/src/lib/onboardingAutocomplete.ts`:

```typescript
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export type AutocompleteResult = {
  instagram?: string
  facebook?: string
  twitter?: string
  linkedin?: string
  tiktok?: string
  industria?: string
  pitch?: string
  productos?: string
  amenazaEstimada?: number
}

const TIMEOUT_MS = 25000

function buildPrompt(nombre: string, sitioWeb: string, tipo: 'company' | 'competitor'): string {
  if (tipo === 'company') {
    return `Busca en la web información pública real de esta empresa:
Nombre: ${nombre}
Sitio web: ${sitioWeb}

Encuentra sus perfiles de redes sociales oficiales (Instagram, Facebook, X/Twitter, LinkedIn, TikTok) y describe brevemente su industria/giro y una frase de pitch.

Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown, con esta forma exacta (usa "" para cualquier campo que no encuentres, nunca inventes datos):
{
  "instagram": "<@usuario o vacío>",
  "facebook": "<nombre de página o vacío>",
  "twitter": "<@usuario o vacío>",
  "linkedin": "<slug de empresa o vacío>",
  "tiktok": "<@usuario o vacío>",
  "industria": "<industria/giro detectado o vacío>",
  "pitch": "<una frase breve describiendo a qué se dedica, máximo 160 caracteres, o vacío>"
}`
  }
  return `Busca en la web información pública real de esta empresa competidora:
Nombre: ${nombre}
Sitio web: ${sitioWeb}

Encuentra sus perfiles de redes sociales oficiales (Instagram, Facebook, X/Twitter, LinkedIn, TikTok), sus productos/servicios principales, y estima su nivel de amenaza competitiva (1-10) basándote en su tamaño y presencia digital aparente.

Responde ÚNICAMENTE con JSON válido, sin texto adicional ni markdown, con esta forma exacta (usa "" para cualquier campo de texto que no encuentres, nunca inventes datos):
{
  "instagram": "<@usuario o vacío>",
  "facebook": "<nombre de página o vacío>",
  "twitter": "<@usuario o vacío>",
  "linkedin": "<slug de empresa o vacío>",
  "tiktok": "<@usuario o vacío>",
  "productos": "<productos o servicios principales detectados, o vacío>",
  "amenazaEstimada": <número del 1 al 10>
}`
}

export async function autocompleteCompanyInfo(
  nombre: string,
  sitioWeb: string,
  tipo: 'company' | 'competitor'
): Promise<AutocompleteResult> {
  const prompt = buildPrompt(nombre, sitioWeb, tipo)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let jsonText = ''
  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
        },
      ],
      messages: [
        { role: 'user', content: prompt },
        { role: 'assistant', content: '{' },
      ],
    }, { signal: controller.signal })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && (event.delta as any)?.type === 'text_delta') {
        jsonText += (event.delta as any).text
      }
    }
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Tiempo de espera agotado buscando información')
    }
    throw new Error(`Error consultando IA: ${err.message}`)
  } finally {
    clearTimeout(timeoutId)
  }

  if (!jsonText) {
    throw new Error('La IA no devolvió resultados')
  }

  jsonText = jsonText
    .replace(/```json\s*/g, '')
    .replace(/```\s*/g, '')
    .trim()
  if (!jsonText.startsWith('{')) jsonText = '{' + jsonText

  try {
    return JSON.parse(jsonText) as AutocompleteResult
  } catch (e) {
    console.error('❌ Error parseando JSON de autocompletado:', jsonText.slice(0, 500))
    throw new Error('La IA devolvió una respuesta con formato inválido')
  }
}
```

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/lib/onboardingAutocomplete.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "feat: add AI-powered autocomplete function for onboarding wizard"
```

---

## Task 2: Ruta backend + rate limiting

**Files:**
- Modify: `backend/src/routes/onboarding.ts` (agregar la ruta al final, antes del `export default router`)
- Modify: `backend/src/index.ts:31-39` (agregar un limiter dedicado)

**Interfaces:**
- Consumes: `autocompleteCompanyInfo` de Task 1 (`../lib/onboardingAutocomplete`), `requireAuth` (ya importado en el archivo).
- Produces: `POST /api/onboarding/autocomplete` — body `{ nombre: string, sitioWeb: string, tipo: 'company' | 'competitor' }`, responde `200 { success: true, data: AutocompleteResult }` o `400`/`502 { success: false, error: string }`.

- [ ] **Step 1: Agregar el rate limiter dedicado en `index.ts`**

En `backend/src/index.ts`, después del bloque de `generateLimiter` (línea 38, después de `app.use('/api/reports/generate', generateLimiter)`), agregar:

```typescript
// Rate limiting para autocompletado IA del wizard — 20 por hora por IP (respaldo del límite de sesión del frontend)
const autocompleteLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Límite de autocompletados alcanzado. Intenta en un rato.' },
  standardHeaders: true,
  legacyHeaders: false,
})
app.use('/api/onboarding/autocomplete', autocompleteLimiter)
```

Esta línea debe ir **antes** de `app.use("/api/onboarding", onboardingRouter)` (línea 43 actual), igual que `generateLimiter` va antes de montar `reportsRouter`.

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Agregar la ruta en `onboarding.ts`**

En `backend/src/routes/onboarding.ts`, agregar el import junto a los existentes:

```typescript
import { autocompleteCompanyInfo } from '../lib/onboardingAutocomplete'
```

Y agregar la ruta nueva al final del archivo, antes de `export default router` (o después del último `router.post`, según la posición actual del archivo):

```typescript
// POST /api/onboarding/autocomplete — autocompletar campos con IA (redes sociales, industria, etc.)
router.post('/autocomplete', requireAuth, async (req: Request, res: Response) => {
  try {
    const { nombre, sitioWeb, tipo } = req.body

    if (typeof nombre !== 'string' || !nombre.trim() || typeof sitioWeb !== 'string' || !sitioWeb.trim()) {
      return res.status(400).json({ success: false, error: 'nombre y sitioWeb son requeridos' })
    }
    if (tipo !== 'company' && tipo !== 'competitor') {
      return res.status(400).json({ success: false, error: 'tipo debe ser "company" o "competitor"' })
    }

    const data = await autocompleteCompanyInfo(nombre.trim(), sitioWeb.trim(), tipo)
    res.status(200).json({ success: true, data })
  } catch (e: any) {
    console.error('Error en autocompletado:', e.message)
    res.status(502).json({ success: false, error: e.message || 'No se pudo completar el autocompletado' })
  }
})
```

- [ ] **Step 4: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\backend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Validación manual — backend de staging**

Con el backend de staging corriendo (`cd backend && npx ts-node src/index.ts`, contra el `.env` de staging ya configurado), probar con `curl` usando una empresa real conocida:

```bash
curl -s -X POST http://localhost:3001/api/onboarding/autocomplete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_valido_de_staging>" \
  -d '{"nombre":"Bimbo","sitioWeb":"https://www.grupobimbo.com","tipo":"company"}'
```

Expected: `200` con un JSON que incluya al menos `industria` y/o `pitch` con contenido plausible (no vacío para una empresa tan conocida). Si `instagram`/`facebook`/etc. vienen vacíos, es aceptable (depende de qué encuentre la búsqueda real) — lo que NO es aceptable es un error 502 o un JSON malformado.

- [ ] **Step 6: Validación manual — caso de error controlado**

```bash
curl -s -X POST http://localhost:3001/api/onboarding/autocomplete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token_valido_de_staging>" \
  -d '{"nombre":"","sitioWeb":"","tipo":"company"}'
```

Expected: `400` con `{"success":false,"error":"nombre y sitioWeb son requeridos"}`.

- [ ] **Step 7: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add backend/src/index.ts backend/src/routes/onboarding.ts
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "feat: add POST /api/onboarding/autocomplete route with rate limiting"
```

**⏸ CHECKPOINT — probar en local antes de continuar:** al terminar este task, el endpoint está completo y probado por curl. Antes de tocar el frontend, confirma con el usuario que el backend responde como se espera contra el entorno de staging.

---

## Task 3: Estado y lógica de autocompletado en el frontend

**Files:**
- Modify: `frontend/app/onboarding/page.tsx` (estado raíz del componente `OnboardingPage`, ~línea 1129-1157)

**Interfaces:**
- Consumes: `supabase.auth.getSession()` (ya usado en el archivo), `process.env.NEXT_PUBLIC_BACKEND_URL` (ya usado como `BACKEND`, línea 1141).
- Produces: función `runAutocomplete(nombre: string, sitioWeb: string, tipo: 'company' | 'competitor'): Promise<AutocompleteResult | null>` y estado `autocompleteUsesLeft: number`, disponibles para pasar como props a `Step1` y `Step3` en Task 4 y Task 5.

- [ ] **Step 1: Agregar el estado del contador de usos**

En `frontend/app/onboarding/page.tsx`, dentro de `OnboardingPage`, junto a los demás `useState` (después de la línea `const [dataLoaded, setDataLoaded] = useState(false)`, línea 1138):

```typescript
  const [autocompleteUsesLeft, setAutocompleteUsesLeft] = useState(8)
```

- [ ] **Step 2: Agregar la función `runAutocomplete`**

Después de la definición de `const set = (key: string, val: any) => ...` (línea 1157), agregar:

```typescript
  const runAutocomplete = async (nombre: string, sitioWeb: string, tipo: 'company' | 'competitor'): Promise<any | null> => {
    if (autocompleteUsesLeft <= 0) {
      throw new Error('Alcanzaste el límite de autocompletados para esta sesión')
    }
    setAutocompleteUsesLeft(prev => prev - 1)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) throw new Error('Sesión no válida')

    const res = await fetch(`${BACKEND}/api/onboarding/autocomplete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + session.access_token,
      },
      body: JSON.stringify({ nombre, sitioWeb, tipo }),
    })
    const json = await res.json()
    if (!res.ok || !json.success) {
      throw new Error(json.error || 'No pudimos completar el autocompletado')
    }
    return json.data
  }
```

- [ ] **Step 3: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores nuevos relacionados a este cambio (el proyecto puede tener warnings preexistentes de `any`, no relevantes aquí).

- [ ] **Step 4: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add frontend/app/onboarding/page.tsx
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "feat: add runAutocomplete function and session use-counter to onboarding wizard"
```

---

## Task 4: Botón de autocompletado en Step1 (empresa)

**Files:**
- Modify: `frontend/app/onboarding/page.tsx` — función `Step1` (línea 119-227) y el punto donde se renderiza `<Step1 .../>` (buscar en el switch de steps, alrededor de línea 1310-1321)

**Interfaces:**
- Consumes: `runAutocomplete(nombre, sitioWeb, tipo)` de Task 3, `data`/`set` (props ya existentes de `Step1`).
- Produces: nada que otras tareas consuman — es la aplicación final de la función en la UI de empresa.

- [ ] **Step 1: Extender la firma de `Step1` para recibir `runAutocomplete`**

Cambiar (línea 119):

```typescript
function Step1({ data, set }: any) {
```

por:

```typescript
function Step1({ data, set, runAutocomplete }: any) {
  const [acLoading, setAcLoading] = useState(false)
  const [acError, setAcError] = useState('')

  const canAutocomplete = !!(data.companyName?.trim() && data.website?.trim())

  const handleAutocomplete = async () => {
    setAcError('')
    setAcLoading(true)
    try {
      const result = await runAutocomplete(data.companyName, data.website, 'company')
      const social = { ...data.socialMedia }
      if (result.instagram && !social.ig) social.ig = result.instagram
      if (result.facebook && !social.fb) social.fb = result.facebook
      if (result.twitter && !social.x) social.x = result.twitter
      if (result.linkedin && !social.li) social.li = result.linkedin
      if (result.tiktok && !social.tt) social.tt = result.tiktok
      set('socialMedia', social)
      if (result.industria && !data.industry) set('industry', result.industria)
      if (result.pitch && !data.pitch) set('pitch', result.pitch)
    } catch (e: any) {
      setAcError(e.message || 'No pudimos encontrar información automática')
    } finally {
      setAcLoading(false)
    }
  }
```

Nota: `useState` ya está importado en el archivo (usado extensamente en `OnboardingPage` y otros steps) — confirmar que el import de React hooks está disponible en el ámbito del archivo (sí lo está, es un solo archivo con `'use client'` al inicio).

- [ ] **Step 2: Agregar el botón junto al campo de sitio web**

En el bloque de "Identidad" (línea 140-144 actual), después del input de sitio web, agregar el botón y el mensaje de error:

```typescript
          <div>
            <label style={S.label}>Sitio web</label>
            <input style={S.input} value={data.website} onChange={e=>set('website',e.target.value)} placeholder="https://tuempresa.com" />
          </div>
          <div>
            <button
              onClick={handleAutocomplete}
              disabled={!canAutocomplete || acLoading}
              style={{
                display:'flex', alignItems:'center', gap:8, padding:'9px 16px', borderRadius:20,
                border:'1px solid rgba(139,123,255,0.3)',
                background: canAutocomplete && !acLoading ? 'rgba(139,123,255,0.15)' : 'rgba(255,255,255,0.03)',
                color: canAutocomplete && !acLoading ? '#8B7BFF' : '#5A627A',
                fontSize:12, fontWeight:600,
                cursor: canAutocomplete && !acLoading ? 'pointer' : 'not-allowed',
              }}
            >
              {acLoading ? '⏳ Buscando...' : '✨ Autocompletar con IA'}
            </button>
            {acError && <div style={{ fontSize:11, color:'#FF6B6B', marginTop:6 }}>{acError}</div>}
          </div>
```

Esto reemplaza el cierre del `<div>` de sitio web (línea 143) para agregar el bloque nuevo justo después, dentro del mismo `grid` de "Identidad" (línea 131, `gridTemplateColumns:'1fr'`), así que aparece como una fila más debajo de sitio web.

- [ ] **Step 3: Pasar `runAutocomplete` a `Step1` en el render**

Buscar dónde se renderiza `<Step1` (en el switch/objeto de steps de `OnboardingPage`, cerca de la línea 1310-1321 donde ya vimos `<Step7 data={data} loading={loading} .../>`). Cambiar la línea que renderiza `Step1` de:

```typescript
1: <Step1 data={data} set={set} />,
```

(ajustar al texto exacto encontrado en el archivo, que puede diferir levemente) a:

```typescript
1: <Step1 data={data} set={set} runAutocomplete={runAutocomplete} />,
```

- [ ] **Step 4: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add frontend/app/onboarding/page.tsx
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "feat: add AI autocomplete button to onboarding Step1 (company)"
```

**⏸ CHECKPOINT — probar en el navegador:** con esto, el flujo de empresa ya es funcional de punta a punta. Antes de continuar con competidores (Task 5), levantar backend (`localhost:3001`) y frontend (`localhost:3000`) de staging, abrir `/onboarding`, llenar nombre + sitio web reales, presionar el botón, y confirmar que redes sociales/industria/pitch se llenan. Confirmar con el usuario antes de seguir.

---

## Task 5: Botón de autocompletado por fila en Step3 (competidores)

**Files:**
- Modify: `frontend/app/onboarding/page.tsx` — función `Step3` (línea 436-502) y su punto de render

**Interfaces:**
- Consumes: `runAutocomplete` (misma función de Task 3, pasada ahora también a `Step3`).
- Produces: nada que otras tareas consuman.

- [ ] **Step 1: Extender la firma de `Step3` y agregar estado por fila**

Cambiar (línea 436):

```typescript
function Step3({ data, set }: any) {
  const list: any[] = data.directCompetitors || [emptyCompetitor()]
  const update = (i:number, field:string, val:any) => set('directCompetitors', list.map((c:any,idx:number)=>idx===i?{...c,[field]:val}:c))
  const add    = () => list.length<10 && set('directCompetitors',[...list, emptyCompetitor()])
  const remove = (i:number) => set('directCompetitors', list.filter((_:any,idx:number)=>idx!==i))
```

por:

```typescript
function Step3({ data, set, runAutocomplete }: any) {
  const list: any[] = data.directCompetitors || [emptyCompetitor()]
  const update = (i:number, field:string, val:any) => set('directCompetitors', list.map((c:any,idx:number)=>idx===i?{...c,[field]:val}:c))
  const add    = () => list.length<10 && set('directCompetitors',[...list, emptyCompetitor()])
  const remove = (i:number) => set('directCompetitors', list.filter((_:any,idx:number)=>idx!==i))

  const [acLoadingIdx, setAcLoadingIdx] = useState<number | null>(null)
  const [acErrors, setAcErrors] = useState<Record<number, string>>({})

  const handleAutocomplete = async (i: number) => {
    const c = list[i]
    setAcErrors(prev => ({ ...prev, [i]: '' }))
    setAcLoadingIdx(i)
    try {
      const result = await runAutocomplete(c.name, c.url, 'competitor')
      const updated: any = { ...c }
      if (result.instagram && !updated.ig) updated.ig = result.instagram
      if (result.facebook && !updated.fb) updated.fb = result.facebook
      if (result.twitter && !updated.x) updated.x = result.twitter
      if (result.linkedin && !updated.li) updated.li = result.linkedin
      if (result.tiktok && !updated.tt) updated.tt = result.tiktok
      if (result.productos && !updated.products) updated.products = result.productos
      if (typeof result.amenazaEstimada === 'number' && (!c.threat || c.threat === 5)) {
        updated.threat = result.amenazaEstimada
      }
      set('directCompetitors', list.map((item: any, idx: number) => idx === i ? updated : item))
    } catch (e: any) {
      setAcErrors(prev => ({ ...prev, [i]: e.message || 'No pudimos encontrar información automática' }))
    } finally {
      setAcLoadingIdx(null)
    }
  }
```

Nota sobre `threat`: `emptyCompetitor()` inicializa `threat: 5` como valor por defecto (visto en línea 94 del archivo) — no hay forma de distinguir "el usuario dejó el default" de "el usuario eligió 5 a propósito". Se acepta sobreescribir solo si el valor sigue en el default de fábrica (`5`), documentado aquí como decisión explícita de este task, no ambigüedad sin resolver.

- [ ] **Step 2: Agregar el botón en cada fila, junto al campo de nombre/sitio web**

En el bloque de cada fila (línea 462-472 actual), después del `<div>` que contiene los inputs de nombre/sitio web/productos y antes del botón de eliminar (`{list.length>1&&<button onClick={()=>remove(i)}...`), agregar el botón de autocompletar. Reemplazar el bloque:

```typescript
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(139,123,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#8B7BFF', flexShrink:0 }}>{c.name?c.name[0].toUpperCase():'?'}</div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                  <input style={S.input} value={c.name} onChange={e=>update(i,'name',e.target.value)} placeholder="Nombre del competidor" />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <input style={S.input} value={c.url} onChange={e=>update(i,'url',e.target.value)} placeholder="sitio.com" />
                    <input style={S.input} value={c.products} onChange={e=>update(i,'products',e.target.value)} placeholder="Productos en competencia" />
                  </div>
                </div>
                {list.length>1&&<button onClick={()=>remove(i)} style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#FF6B6B', fontSize:14 }}>×</button>}
              </div>
```

por:

```typescript
              <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(139,123,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:800, color:'#8B7BFF', flexShrink:0 }}>{c.name?c.name[0].toUpperCase():'?'}</div>
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                  <input style={S.input} value={c.name} onChange={e=>update(i,'name',e.target.value)} placeholder="Nombre del competidor" />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                    <input style={S.input} value={c.url} onChange={e=>update(i,'url',e.target.value)} placeholder="sitio.com" />
                    <input style={S.input} value={c.products} onChange={e=>update(i,'products',e.target.value)} placeholder="Productos en competencia" />
                  </div>
                </div>
                <button
                  onClick={()=>handleAutocomplete(i)}
                  disabled={!(c.name?.trim() && c.url?.trim()) || acLoadingIdx === i}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                    padding:'8px 12px', borderRadius:8,
                    border:'1px solid rgba(139,123,255,0.3)',
                    background: (c.name?.trim() && c.url?.trim() && acLoadingIdx !== i) ? 'rgba(139,123,255,0.15)' : 'rgba(255,255,255,0.03)',
                    color: (c.name?.trim() && c.url?.trim() && acLoadingIdx !== i) ? '#8B7BFF' : '#5A627A',
                    fontSize:11, fontWeight:600,
                    cursor: (c.name?.trim() && c.url?.trim() && acLoadingIdx !== i) ? 'pointer' : 'not-allowed',
                  }}
                >
                  {acLoadingIdx === i ? '⏳' : '✨ IA'}
                </button>
                {list.length>1&&<button onClick={()=>remove(i)} style={{ background:'rgba(255,107,107,0.1)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:8, width:28, height:28, cursor:'pointer', color:'#FF6B6B', fontSize:14 }}>×</button>}
              </div>
              {acErrors[i] && <div style={{ fontSize:11, color:'#FF6B6B', marginBottom:10 }}>{acErrors[i]}</div>}
```

- [ ] **Step 3: Pasar `runAutocomplete` a `Step3` en el render**

Igual que en Task 4 Step 3, ubicar la línea que renderiza `<Step3` en el switch de steps y agregar la prop:

```typescript
3: <Step3 data={data} set={set} runAutocomplete={runAutocomplete} />,
```

(ajustar al texto exacto ya presente, análogo al cambio hecho para `Step1`).

- [ ] **Step 4: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Commit**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add frontend/app/onboarding/page.tsx
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "feat: add per-row AI autocomplete button to onboarding Step3 (competitors)"
```

**⏸ CHECKPOINT — probar en el navegador:** con backend y frontend de staging corriendo, abrir `/onboarding`, avanzar al step de competidores, llenar nombre + sitio web de un competidor real, presionar "✨ IA" en esa fila, confirmar que redes sociales/productos/amenaza se llenan sin tocar lo que ya estuviera escrito a mano. Probar también el caso de fallo (nombre/sitio web sin presencia web real) y confirmar que el mensaje de error aparece sin romper el wizard. Confirmar con el usuario antes de dar el plan por terminado.

---

## Task 6: Límite de sesión visible al usuario

**Files:**
- Modify: `frontend/app/onboarding/page.tsx` — `Step1` y `Step3` (mensajes de error ya agregados en Tasks 4 y 5)

**Interfaces:**
- Consumes: `autocompleteUsesLeft` (estado de Task 3), debe pasarse como prop adicional a `Step1` y `Step3`.
- Produces: nada — es el cierre visual del límite de uso ya impuesto en `runAutocomplete` (Task 3, que ya lanza el error "Alcanzaste el límite..." cuando se agota). Este task solo asegura que el mensaje de error de límite se vea igual que cualquier otro error de autocompletado, sin lógica adicional.

- [ ] **Step 1: Confirmar que el mensaje de límite ya se muestra correctamente**

`runAutocomplete` (Task 3) lanza `Error('Alcanzaste el límite de autocompletados para esta sesión')` cuando `autocompleteUsesLeft <= 0`, y tanto `Step1.handleAutocomplete` (Task 4) como `Step3.handleAutocomplete` (Task 5) capturan cualquier error de `runAutocomplete` en su `catch` y lo muestran vía `acError`/`acErrors[i]`. No se requiere código nuevo — este step es de verificación.

Run manual: en el navegador, presionar el botón de autocompletar 9 veces seguidas (contando empresa + competidores) en la misma sesión de wizard (sin recargar la página). Expected: en el noveno intento, el botón permite el click pero el mensaje de error muestra "Alcanzaste el límite de autocompletados para esta sesión" en vez de intentar la llamada real (verificar en la pestaña Network del navegador que no sale un request nuevo al backend en ese noveno intento).

- [ ] **Step 2: Si el comportamiento no es el esperado, ajustar `runAutocomplete`**

Si el paso anterior revela que el request sí se dispara antes de fallar (por ejemplo, si `setAutocompleteUsesLeft` no se aplicó a tiempo por el async de React), mover la validación de límite ANTES del `setAutocompleteUsesLeft` en `runAutocomplete` (ya está así en el código de Task 3 — este step es solo para confirmarlo o corregirlo si algo se desvió durante la implementación de tasks anteriores).

- [ ] **Step 3: Commit (solo si hubo cambios en el Step 2)**

```bash
git -C "D:\Trabajo\FLOW11\OmniReports" add frontend/app/onboarding/page.tsx
git -C "D:\Trabajo\FLOW11\OmniReports" commit -m "fix: ensure session autocomplete limit blocks request before it fires"
```

Si no hubo cambios (el comportamiento ya era correcto), no crear un commit vacío — simplemente marcar el task como completo.
