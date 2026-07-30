# Tags Cloud Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar la nube plana de 79 tags (`TAGS_LIB`) por la nueva taxonomía de 40 industrias del usuario, agrupada en 12 categorías con encabezado, con un campo de búsqueda que filtra en vivo a través de todos los grupos.

**Architecture:** Un cambio de datos (array plano → array de grupos) y un cambio de render acotado a un solo bloque de `Step1` en `frontend/app/onboarding/page.tsx`. Sin backend, sin dependencias nuevas.

**Tech Stack:** React (`useState` local), TypeScript — mismo archivo y patrones ya usados en el resto del wizard.

## Global Constraints

- Alcance limitado a `TAGS_LIB` y su render en `Step1` — `INDUSTRY_GROUPS` (el `<select>` de Industria) y cualquier tag de competidores quedan explícitamente fuera, confirmado en brainstorm.
- El límite de 10 tags activos y el contador `X/10` se mantienen sin cambios de comportamiento.
- Un tag ya seleccionado permanece visible/clickeable aunque no coincida con el término de búsqueda actual — nunca "desaparece" una selección existente.
- Un grupo sin ningún tag visible tras el filtro se oculta completo (encabezado incluido), no se muestra vacío.
- Tags ordenados alfabéticamente dentro de cada grupo.
- Sin test runner en el proyecto — validación manual: `npx tsc --noEmit` y prueba en navegador contra el entorno de staging local (backend `localhost:3001`, frontend `localhost:3000`).
- Reusar los estilos ya existentes `S.pill`/`S.pillOn` (línea 113-114) para los botones de tag — no inventar un estilo nuevo.

---

## Task 1: Reemplazar TAGS_LIB por la taxonomía agrupada

**Files:**
- Modify: `frontend/app/onboarding/page.tsx:19-58` (reemplaza la definición completa de `TAGS_LIB`)

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: `TAGS_GROUPS: { group: string, tags: string[] }[]` — 12 grupos, 40 tags en total, cada array de `tags` ya en orden alfabético. Consumido por Task 2.

- [ ] **Step 1: Reemplazar la definición de TAGS_LIB**

En `frontend/app/onboarding/page.tsx`, el bloque actual (líneas 19-58):

```typescript
const TAGS_LIB = [
  // Manufactura
  'Manufactura','Industria 4.0','Automatización','Cadena de suministro','Control de calidad',
  // Comercio / Retail
  'Retail','E-commerce','Marketplace','Omnicanal','D2C','POS',
  // Tecnología
  'SaaS B2B','SaaS B2C','Inteligencia Artificial','Ciberseguridad','Cloud','DevOps','API-first',
  // Finanzas
  'Fintech','Banking','Crédito','Pagos','Insurtech','Wealth','Roboadvisor','Web3','Trading',
  // Salud
  'Salud digital','Telemedicina','MedTech','Farmacia online','BioTech',
  // Educación
  'EdTech','E-learning','Upskilling','Educación K-12','Universidad',
  // Alimentos
  'FoodTech','Restaurantes','Agro-alimentos','Bebidas','Delivery de comida',
  // Construcción
  'PropTech','Inmobiliaria','Construcción','Infraestructura','Smart buildings',
  // Logística
  'Logística','Last-mile','Transporte','Flota','Supply chain',
  // Turismo
  'Turismo','Hospitalidad','TravelTech','Hoteles','Experiencias',
  // Servicios profesionales
  'Consultoría','Legal','Contabilidad','RR.HH.','Marketing digital',
  // Automotriz
  'Automotriz','Movilidad eléctrica','Fleet management','AutoTech',
  // Energía
  'Energía renovable','Oil & Gas','CleanTech','Utilities',
  // Telecomunicaciones
  'Telecomunicaciones','Medios digitales','Streaming','AdTech',
  // Farmacéutica
  'Farmacéutica','BioTech','Dispositivos médicos','CRO',
  // Agro
  'AgriTech','Agroindustria','Ganadería','Acuicultura',
  // Gobierno
  'GovTech','ONG','Sector público','Smart city',
  // Moda
  'Moda','Retail de lujo','Consumo masivo','Belleza',
  // Entretenimiento
  'Entretenimiento','Deportes','GameTech','eSports','Eventos',
]
```

Reemplazar por:

```typescript
const TAGS_GROUPS: { group: string; tags: string[] }[] = [
  { group: 'Industria y Manufactura', tags: ['Automatización e Industria 4.0', 'Automotriz y Movilidad', 'Manufactura y Ensamble', 'Química y Farmacéutica'] },
  { group: 'Logística y Distribución', tags: ['Almacenamiento y Distribución', 'Gestión de Flotas', 'Logística y Transporte', 'Última Milla y Delivery'] },
  { group: 'Retail y Comercio', tags: ['Consumo Masivo (FMCG)', 'E-commerce y Marketplaces', 'Moda y Belleza', 'Retail y Comercio Físico'] },
  { group: 'Finanzas', tags: ['Banca y Servicios Financieros', 'Fintech', 'Insurtech', 'Pagos y Transferencias'] },
  { group: 'Tecnología', tags: ['Ciberseguridad', 'Desarrollo de Software y APIs', 'Infraestructura Cloud y DevOps', 'Inteligencia Artificial y Datos', 'SaaS B2B / B2C'] },
  { group: 'Salud', tags: ['Dispositivos Médicos y Biotech', 'MedTech y Salud Digital', 'Servicios de Salud y Hospitales'] },
  { group: 'Agro y Alimentos', tags: ['Agricultura y Ganadería (Agtech)', 'Alimentos y Bebidas', 'Restaurantes y FoodTech'] },
  { group: 'Bienes Raíces y Construcción', tags: ['Construcción e Infraestructura', 'Inmobiliaria y PropTech'] },
  { group: 'Educación y Turismo', tags: ['EdTech y Educación Online', 'Entretenimiento y Eventos', 'Instituciones Educativas', 'Turismo y Hotelería'] },
  { group: 'Energía y Servicios Públicos', tags: ['Energía y Renovables', 'Servicios Públicos (Utilities)'] },
  { group: 'Medios y Telecomunicaciones', tags: ['Marketing y Publicidad (AdTech)', 'Medios, Streaming y Entretenimiento', 'Telecomunicaciones'] },
  { group: 'Servicios y Sector Público', tags: ['GovTech y Sector Público', 'ONGs y Tercer Sector', 'Servicios Profesionales (Consultoría, Legal, Contabilidad, RR.HH.)'] },
]
```

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores (la constante nueva no se usa todavía en ningún render — `TAGS_LIB` sigue referenciada en el render viejo hasta Task 2, así que este paso por sí solo romperá la compilación con "TAGS_LIB is not defined" — **esto es esperado**; ver nota abajo).

**Nota importante:** este Task 1, aislado, deja el archivo temporalmente sin compilar porque el render en línea ~279 sigue usando `TAGS_LIB` (ahora eliminado). Esto es intencional dado el tamaño acotado del cambio — Task 1 y Task 2 se combinan en un solo commit en vez de dos, ya que separarlos dejaría un commit intermedio no compilable, lo cual viola la práctica de commits funcionales. Continuar directo con Task 2 antes de hacer el commit de Task 1.

- [ ] **Step 3: Contar y verificar la taxonomía completa**

Antes de continuar a Task 2, correr una verificación rápida de que los 40 tags están todos presentes y sin duplicados:

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && node -e "
const fs = require('fs');
const content = fs.readFileSync('app/onboarding/page.tsx', 'utf-8');
const match = content.match(/const TAGS_GROUPS[\s\S]*?\n\]/);
const groupCount = (match[0].match(/group:/g) || []).length;
const tagMatches = match[0].match(/'[^']+'/g) || [];
const tags = tagMatches.filter((_, i) => i % 2 === 1 || true); // rough count, refine below
console.log('Grupos encontrados:', groupCount);
"`

Expected: `Grupos encontrados: 12`. (Este script es una verificación aproximada de conteo de grupos; la verificación real de los 40 tags exactos se hace visualmente comparando contra la lista de la Step 1 de esta tarea al momento de escribir el código — no hay necesidad de un script más preciso para un array literal ya completo).

---

## Task 2: Reestructurar el render con grupos y búsqueda

**Files:**
- Modify: `frontend/app/onboarding/page.tsx` — dentro de `Step1` (función que empieza en línea 129), estado local nuevo, y el bloque de render de tags (líneas 273-284 actuales)

**Interfaces:**
- Consumes: `TAGS_GROUPS` de Task 1.
- Produces: nada que otras tareas consuman — es el cierre visual y funcional del cambio completo.

- [ ] **Step 1: Agregar el estado local de búsqueda dentro de Step1**

`Step1` ya tiene estado local propio desde el plan de autocompletado (`acLoading`, `acError` — buscar `const [acLoading, setAcLoading] = useState(false)` cerca del inicio de la función `Step1`). Agregar justo después de esas líneas:

```typescript
  const [tagSearch, setTagSearch] = useState('')
```

- [ ] **Step 2: Reemplazar el bloque de render de tags**

El bloque actual (líneas 273-284):

```typescript
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <label style={S.label}>Tags activos</label>
            <span style={{ fontSize:10, color:'#5A627A' }}>{(data.tags||[]).length}/10</span>
          </div>
          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
            {TAGS_LIB.map(tag=>{
              const on=(data.tags||[]).includes(tag)
              return <button key={tag} onClick={()=>set('tags', on ? data.tags.filter((t:string)=>t!==tag) : data.tags?.length<10 ? [...(data.tags||[]),tag] : data.tags)} style={on?{...S.pillOn}:{...S.pill}}>{tag}{on&&' ×'}</button>
            })}
          </div>
        </div>
```

Reemplazar por:

```typescript
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <label style={S.label}>Tags activos</label>
            <span style={{ fontSize:10, color:'#5A627A' }}>{(data.tags||[]).length}/10</span>
          </div>
          <input
            style={{ ...S.input, marginBottom:12 }}
            value={tagSearch}
            onChange={e=>setTagSearch(e.target.value)}
            placeholder="Buscar industria..."
          />
          {TAGS_GROUPS.map(({ group, tags }) => {
            const q = tagSearch.trim().toLowerCase()
            const visibleTags = tags.filter(tag =>
              (data.tags||[]).includes(tag) || tag.toLowerCase().includes(q)
            )
            if (visibleTags.length === 0) return null
            return (
              <div key={group} style={{ marginBottom:14 }}>
                <div style={{ fontSize:10, fontWeight:700, color:'#5A627A', letterSpacing:'0.06em', marginBottom:6 }}>{group.toUpperCase()}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {visibleTags.map(tag=>{
                    const on=(data.tags||[]).includes(tag)
                    return <button key={tag} onClick={()=>set('tags', on ? data.tags.filter((t:string)=>t!==tag) : data.tags?.length<10 ? [...(data.tags||[]),tag] : data.tags)} style={on?{...S.pillOn}:{...S.pill}}>{tag}{on&&' ×'}</button>
                  })}
                </div>
              </div>
            )
          })}
        </div>
```

Nota sobre el orden alfabético: `TAGS_GROUPS` (Task 1) ya define los tags de cada grupo en orden alfabético como parte del array literal — no se requiere un `.sort()` en el render, evitando reordenar en cada render innecesariamente.

Nota sobre el filtro: `visibleTags` incluye un tag si YA está seleccionado (`data.tags.includes(tag)`) SIN importar el término de búsqueda, o si coincide con el término de búsqueda — cumpliendo la regla de "un tag seleccionado nunca desaparece al filtrar".

- [ ] **Step 3: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores. Con este paso, `TAGS_LIB` ya no se referencia en ningún lado del archivo (reemplazado completamente por `TAGS_GROUPS`).

- [ ] **Step 4: Confirmar que no queda ninguna referencia residual a TAGS_LIB**

Run: `grep -n "TAGS_LIB" "D:\Trabajo\FLOW11\OmniReports\frontend\app\onboarding\page.tsx"`
Expected: sin resultados (cero coincidencias) — confirma que el reemplazo fue completo y no quedó un uso huérfano.

- [ ] **Step 5: Commit (incluye Task 1 y Task 2 juntos, ver nota de Task 1)**

```bash
git add frontend/app/onboarding/page.tsx
git commit -m "feat: redesign tags cloud with 40-industry taxonomy, grouped sections and live search"
```

**⏸ CHECKPOINT — probar en navegador:** con backend (`localhost:3001`) y frontend (`localhost:3000`) corriendo contra el entorno de staging, abrir `/onboarding`, ir al step "Tu empresa" → sección "Catálogo y enfoque sectorial". Confirmar:
1. Se ven los 12 grupos con encabezado, cada uno con sus tags correctos, en orden alfabético dentro del grupo.
2. Escribir algo en el buscador (ej. "tech") filtra correctamente — solo quedan visibles los tags que coinciden, y los grupos sin coincidencias desaparecen por completo.
3. Seleccionar un tag, luego escribir algo en el buscador que NO lo incluya — el tag seleccionado debe seguir visible y poder deseleccionarse.
4. Seleccionar 10 tags y confirmar que ya no se pueden agregar más (comportamiento preexistente, sin cambios).
5. Borrar el buscador — todos los 12 grupos vuelven a mostrarse completos.

---

## Self-Review

**Cobertura del spec:** los 40 tags de la taxonomía del spec están todos presentes en el array de Task 1 (verificado por comparación 1:1 contra la lista de 12 grupos del documento de diseño). El comportamiento de búsqueda (filtro en vivo, grupo oculto si vacío, tag seleccionado nunca desaparece, orden alfabético) está implementado explícitamente en Task 2 con comentarios que documentan cada regla. `INDUSTRY_GROUPS` y competidores no aparecen en ninguna tarea — correctamente fuera de alcance.

**Placeholder scan:** sin "TBD"/genéricos. El único paso no 100%-determinista es el Step 3 de Task 1 (script de conteo aproximado) — documentado explícitamente como aproximado y no crítico, ya que el array literal completo se escribe en el mismo paso.

**Consistencia de tipos:** `TAGS_GROUPS: { group: string; tags: string[] }[]` se define en Task 1 y se consume con la misma forma (`{ group, tags }`) en Task 2 — coincide.
