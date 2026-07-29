# Social Media Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar las siglas de texto (IG/FB/X/LI/TT/YT) por logos SVG reales de `react-icons` en los campos de redes sociales del wizard de onboarding, en color monocromático morado de acento.

**Architecture:** Un mapa compartido `key → componente de icono` definido una vez cerca de las constantes existentes del archivo, consumido por los dos puntos de render que hoy muestran siglas (`Step1` para la empresa, `Step3` para competidores directos).

**Tech Stack:** React, `react-icons` (subset `react-icons/fa6`, versión ^5.7.0) — dependencia nueva, sin backend involucrado.

## Global Constraints

- Color de los iconos: `#8B7BFF` (mismo morado de acento que usan las siglas hoy) — no usar colores de marca.
- Tamaño de icono: 14px (equivalente visual al `fontSize:10` de la sigla en un `<span>`, ajustado porque un SVG a 10px se ve demasiado pequeño comparado a texto de 10px — usar 14px como el tamaño real elegido).
- No modificar ningún otro aspecto del layout existente (spacing, bordes, inputs) — solo el contenido del `<span>` que hoy muestra la sigla.
- Sin test runner en el proyecto — validación manual: `npx tsc --noEmit` y prueba visual en navegador contra el entorno de staging (backend `localhost:3001`, frontend `localhost:3000`, ya configurado en sesiones previas de este mismo branch).
- Alcance limitado a `frontend/app/onboarding/page.tsx`, líneas 242 (Step1) y 587 (Step3) — no tocar Step4 (competidores indirectos, sin campos de redes sociales) ni la nube de tags (spec separado).

---

## Task 1: Instalar react-icons y crear el mapa de iconos compartido

**Files:**
- Modify: `frontend/package.json` (agregar dependencia)
- Modify: `frontend/app/onboarding/page.tsx:1-5` (imports) y línea ~73 (antes de `const AREAS = [`)

**Interfaces:**
- Consumes: nada (primera tarea).
- Produces: `SOCIAL_ICONS: Record<string, IconType>` — objeto exportado a nivel de módulo (no exportado del archivo, solo definido en el scope superior, ya que ambos consumidores — Task 2 y Task 3 — están en el mismo archivo). Claves: `ig`, `fb`, `x`, `li`, `tt`, `yt`. Cada valor es un componente de icono de `react-icons/fa6` que acepta las props estándar `size` y `color`.

- [ ] **Step 1: Instalar la dependencia**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && pnpm add react-icons`

Expected: `react-icons` aparece en `frontend/package.json` bajo `dependencies`, con versión `^5.7.0` o la que `pnpm` resuelva como última estable en ese momento.

- [ ] **Step 2: Agregar el import de los iconos**

En `frontend/app/onboarding/page.tsx`, agregar después de la línea 5 (`import posthog from 'posthog-js'`):

```typescript
import { FaInstagram, FaFacebook, FaXTwitter, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa6'
import type { IconType } from 'react-icons'
```

- [ ] **Step 3: Definir el mapa compartido de iconos**

Justo antes de la línea `const AREAS = [` (línea 73 actual), agregar:

```typescript
const SOCIAL_ICONS: Record<string, IconType> = {
  ig: FaInstagram,
  fb: FaFacebook,
  x: FaXTwitter,
  li: FaLinkedin,
  tt: FaTiktok,
  yt: FaYoutube,
}
```

- [ ] **Step 4: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores (el mapa está definido pero aún no se usa en ningún render — Tasks 2 y 3 lo consumen).

- [ ] **Step 5: Commit**

```bash
git add frontend/package.json frontend/pnpm-lock.yaml frontend/app/onboarding/page.tsx
git commit -m "feat: install react-icons and add shared social icon map"
```

---

## Task 2: Aplicar iconos en Step1 (empresa)

**Files:**
- Modify: `frontend/app/onboarding/page.tsx:242-245`

**Interfaces:**
- Consumes: `SOCIAL_ICONS` de Task 1.
- Produces: nada que otras tareas consuman — Task 3 usa el mismo `SOCIAL_ICONS` pero de forma independiente.

- [ ] **Step 1: Reemplazar el render del bloque de redes sociales**

En `frontend/app/onboarding/page.tsx`, la línea 242-247 actual:

```typescript
          {[['IG','ig','@usuario'],['FB','fb','@pagina'],['TT','tt','@usuario'],['YT','yt','@canal'],['LI','li','@empresa'],['X','x','@usuario']].map(([icon,key,ph])=>(
            <div key={key} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'8px 10px', minWidth:0, overflow:'hidden' }}>
              <span style={{ fontSize:10, fontWeight:800, color:'#8B7BFF', width:16, flexShrink:0 }}>{icon}</span>
              <input style={{ flex:1, minWidth:0, width:0, background:'transparent', border:'none', outline:'none', color:'#F0F2FF', fontSize:12 }} value={data.socialMedia?.[key]||''} onChange={e=>set('socialMedia',{...data.socialMedia,[key]:e.target.value})} placeholder={ph} />
            </div>
          ))}
```

Reemplazar por:

```typescript
          {[['ig','@usuario'],['fb','@pagina'],['tt','@usuario'],['yt','@canal'],['li','@empresa'],['x','@usuario']].map(([key,ph])=>{
            const Icon = SOCIAL_ICONS[key]
            return (
            <div key={key} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'8px 10px', minWidth:0, overflow:'hidden' }}>
              <Icon size={14} color="#8B7BFF" style={{ flexShrink:0 }} />
              <input style={{ flex:1, minWidth:0, width:0, background:'transparent', border:'none', outline:'none', color:'#F0F2FF', fontSize:12 }} value={data.socialMedia?.[key]||''} onChange={e=>set('socialMedia',{...data.socialMedia,[key]:e.target.value})} placeholder={ph} />
            </div>
            )
          })}
```

Nota: el array cambia de tuplas de 3 elementos `[sigla, key, placeholder]` a tuplas de 2 `[key, placeholder]` — la sigla ya no se necesita como dato, el icono se resuelve vía `SOCIAL_ICONS[key]`. El `width:16` que tenía el `<span>` se elimina porque los iconos SVG de `react-icons` ya tienen su propio tamaño intrínseco vía la prop `size`.

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/onboarding/page.tsx
git commit -m "feat: replace social media abbreviations with icons in Step1 (company)"
```

**⏸ CHECKPOINT — probar en navegador:** con el entorno de staging corriendo (backend `localhost:3001`, frontend `localhost:3000`), abrir `/onboarding`, confirmar que el step de empresa ("Presencia digital") muestra los 6 logos reales (Instagram, Facebook, TikTok, YouTube, LinkedIn, X) en morado, alineados correctamente junto a cada input, sin romper el grid de 2 columnas.

---

## Task 3: Aplicar iconos en Step3 (competidores)

**Files:**
- Modify: `frontend/app/onboarding/page.tsx:587-591`

**Interfaces:**
- Consumes: `SOCIAL_ICONS` de Task 1.
- Produces: nada.

- [ ] **Step 1: Reemplazar el render del bloque de redes sociales por competidor**

En `frontend/app/onboarding/page.tsx`, la línea 587-592 actual:

```typescript
                  {[['IG','ig'],['FB','fb'],['X','x'],['LI','li'],['TT','tt']].map(([icon,key])=>(
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'6px 10px', flex:1, minWidth:100 }}>
                      <span style={{ fontSize:10, fontWeight:800, color:'#8B7BFF', flexShrink:0 }}>{icon}</span>
                      <input style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#F0F2FF', fontSize:12 }} value={c[key]||''} onChange={e=>update(i,key,e.target.value)} placeholder="@usuario" />
                    </div>
                  ))}
```

Reemplazar por:

```typescript
                  {['ig','fb','x','li','tt'].map((key)=>{
                    const Icon = SOCIAL_ICONS[key]
                    return (
                    <div key={key} style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'6px 10px', flex:1, minWidth:100 }}>
                      <Icon size={14} color="#8B7BFF" style={{ flexShrink:0 }} />
                      <input style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:'#F0F2FF', fontSize:12 }} value={c[key]||''} onChange={e=>update(i,key,e.target.value)} placeholder="@usuario" />
                    </div>
                    )
                  })}
```

Nota: aquí el array original ya no tenía placeholder por red (todas usan `"@usuario"` fijo, visible en el `<input>`), así que se simplifica a un array plano de claves `['ig','fb','x','li','tt']` en vez de tuplas.

- [ ] **Step 2: Verificar compilación**

Run: `cd "D:\Trabajo\FLOW11\OmniReports\frontend" && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/onboarding/page.tsx
git commit -m "feat: replace social media abbreviations with icons in Step3 (competitors)"
```

**⏸ CHECKPOINT — probar en navegador:** en `/onboarding`, avanzar al step de competidores directos, confirmar que cada fila de competidor muestra los 5 logos reales (Instagram, Facebook, X, LinkedIn, TikTok) en morado, alineados junto a sus inputs `@usuario`, sin romper el layout de la fila.

---

## Self-Review

**Cobertura del spec:** los dos puntos de render identificados en el spec (Step1 línea 242, Step3 línea 587) tienen tarea dedicada (Task 2, Task 3). La dependencia nueva y el mapa compartido están en Task 1, consumidos por ambas. El color monocromático (`#8B7BFF`) y el tamaño (14px) están fijados como Global Constraint y aplicados literalmente en el código de ambas tareas. Fuera de alcance (tags, Step4) no se tocan en ningún task — correcto.

**Placeholder scan:** sin "TBD"/genéricos — cada step tiene el código completo antes/después, comandos exactos.

**Consistencia de tipos:** `SOCIAL_ICONS` se define en Task 1 con las 6 claves (`ig,fb,x,li,tt,yt`) y se consume en Task 2 (las 6) y Task 3 (5 de las 6, sin `yt` — correcto, Step3 nunca tuvo YouTube). Los nombres de componente (`FaInstagram`, etc.) coinciden entre la definición y el import.
