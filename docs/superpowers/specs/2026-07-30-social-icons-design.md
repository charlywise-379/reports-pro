# Iconos de Redes Sociales en el Wizard — Diseño

**Fecha:** 2026-07-30
**Rama:** `feature/wizard-ai-autocomplete` (continuación del mismo trabajo de optimizaciones del módulo de Inteligencia Competitiva)
**Origen:** ítem de la lista de "Mejoras" — "Reemplazar las siglas de los campos de redes sociales por los iconos de las redes, actualmente son siglas. Ej: FB para Facebook."

## Contexto

El wizard de onboarding (`frontend/app/onboarding/page.tsx`) muestra los campos de redes sociales de la empresa y de cada competidor directo con siglas de texto (`IG`, `FB`, `X`, `LI`, `TT`, `YT`) en vez de los logos reales de cada red. Hay exactamente dos puntos en el código donde esto ocurre:

- **`Step1`** (línea 242): campos de la empresa — 6 redes (`IG`, `FB`, `TT`, `YT`, `LI`, `X`).
- **`Step3`** (línea 587): campos por competidor directo — 5 redes (`IG`, `FB`, `X`, `LI`, `TT`).

Ambos usan el mismo patrón: un array de tuplas `[sigla, key, placeholder?]` mapeado a un `<span>{sigla}</span>` renderizado en color morado de acento (`#8B7BFF`) junto al input de texto correspondiente.

## Alcance

**Incluye:** reemplazar las 6 siglas de `Step1` y las 5 de `Step3` por iconos SVG reales, en el mismo color monocromático que usan hoy las siglas.

**Fuera de alcance (explícito):**
- Nube de tags de industrias — spec separado.
- Competidores indirectos (`Step4`) — no tienen campos de redes sociales hoy, no se agregan en este cambio.
- Cualquier cambio de color/paleta más allá del monocromático ya existente.

## Decisiones de diseño

1. **Librería:** `react-icons` (subset `react-icons/fa6`), agregada como dependencia nueva. Se descartó `lucide-react` (ya instalado en el proyecto) porque no incluye logos de marca — solo iconos genéricos de interfaz; se confirmó explícitamente que no existe ningún icono de Instagram/Facebook/TikTok/LinkedIn/YouTube/X en su set instalado.
2. **Color:** monocromático, heredando el mismo `#8B7BFF` (morado de acento) que usan las siglas actuales — no se introduce el color de marca de cada red, para mantener la consistencia visual oscura/monocromática del resto del wizard.
3. **Mapa de iconos compartido:** un solo `SOCIAL_ICONS: Record<string, IconType>` definido una vez cerca de la parte superior del archivo (junto a otras constantes compartidas como `AREAS`), reusado por ambos steps — evita duplicar el mapeo clave→icono en dos lugares.

## Componentes técnicos

**`frontend/package.json`:** agregar `react-icons` a `dependencies`.

**`frontend/app/onboarding/page.tsx`:**
- Import: `import { FaInstagram, FaFacebook, FaXTwitter, FaLinkedin, FaTiktok, FaYoutube } from 'react-icons/fa6'`.
- Constante nueva: `const SOCIAL_ICONS: Record<string, IconType> = { ig: FaInstagram, fb: FaFacebook, x: FaXTwitter, li: FaLinkedin, tt: FaTiktok, yt: FaYoutube }` (tipo `IconType` importado de `react-icons`).
- **`Step1` (línea 242):** el array `[['IG','ig','@usuario'], ...]` cambia su primer elemento de sigla-string a la misma `key` (ya no se necesita un valor separado para mostrar, se usa `SOCIAL_ICONS[key]` directamente) — o se simplifica el array a solo `[key, placeholder]` por claridad. El render reemplaza `<span style={{...}}>{icon}</span>` por `<Icon size={14} color="#8B7BFF" />` usando el componente resuelto de `SOCIAL_ICONS[key]`.
- **`Step3` (línea 587):** mismo tratamiento, con su propio array de 5 redes (sin `yt`).

## Validación

Sin test runner en el proyecto — validación manual:
1. `npx tsc --noEmit` en `frontend/` tras el cambio.
2. Prueba visual en el navegador contra el entorno de staging: confirmar que los 6 iconos en `Step1` y los 5 en `Step3` se renderizan correctamente, en el color morado de acento esperado, sin romper el layout/alineación de los inputs junto a los que aparecen.
