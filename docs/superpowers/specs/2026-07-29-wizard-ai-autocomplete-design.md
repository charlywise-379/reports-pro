# Autocompletado con IA en el Wizard de Onboarding — Diseño

**Fecha:** 2026-07-29
**Rama:** `feature/wizard-ai-autocomplete` (desde `fix/security-hardening`)
**Origen:** primer ítem de la lista de "Mejoras" del módulo de Inteligencia Competitiva, marcado como crítico por el usuario.

## Contexto

El wizard de onboarding (`frontend/app/onboarding/page.tsx`, ~1400 líneas) pide al usuario llenar manualmente: datos de la empresa (nombre, sitio web, redes sociales, industria, pitch) y datos de cada competidor directo (nombre, sitio web, redes sociales, categoría/productos, nivel de amenaza). Este diseño agrega un botón de autocompletado asistido por IA que, dado un nombre y un sitio web, busca en la web real y llena los campos vacíos automáticamente — reduciendo la fricción de llenado sin quitarle control al usuario.

Es el primer sub-proyecto de una lista más grande de optimizaciones (tags, campos nuevos de competidor, Super Admin, notificaciones, R2, bug de Stripe) que se están descomponiendo en specs independientes. Este documento cubre únicamente el autocompletado.

## Alcance

**Incluye:**
- Autocompletado en el step "Tu empresa": redes sociales (Instagram, Facebook, X, LinkedIn, TikTok), industria/giro del negocio, pitch/descripción breve.
- Autocompletado por fila en "Competidores directos": redes sociales, categoría/productos, nivel de amenaza estimado.
- Endpoint backend nuevo que llama a Claude con la tool de búsqueda web.
- Límite de uso por sesión de wizard + rate limit de respaldo por IP en el servidor.

**Fuera de alcance (explícito):**
- Autocompletado en "Competidores indirectos" — no se pidió, se mantiene manual.
- El campo de sitio web y TikTok nuevos en el modelo de datos de competidores — es un ítem separado de la lista original (agregar campos), con su propio spec.
- Cambios al modelo de tags/industrias — spec separado.
- Cualquier ajuste al reemplazo de siglas por iconos de redes sociales — spec separado, aunque toca los mismos archivos de UI del wizard.

## Comportamiento

1. El botón "✨ Autocompletar con IA" aparece deshabilitado hasta que el campo de nombre Y el campo de sitio web tengan contenido (tanto en el step de empresa como en cada fila de competidor).
2. Al presionarlo, se dispara una llamada al backend con `{ nombre, sitioWeb, tipo: 'company' | 'competitor' }`.
3. El backend usa Claude (`claude-sonnet-4-5`, mismo modelo que `reportEngine.ts`) con la tool `web_search_20250305` para buscar información real de esa empresa/competidor en la web, con un prompt corto y acotado a devolver únicamente los campos pedidos en JSON.
4. El frontend aplica el resultado **solo a los campos que estén vacíos** — cualquier dato que el usuario ya haya escrito a mano se conserva sin tocar.
5. Mientras la llamada está en curso, el botón muestra un estado de carga (spinner) y se deshabilita para evitar doble click.
6. Si la llamada falla (timeout, error de Claude, JSON inválido, sin resultados), se muestra un mensaje breve no bloqueante ("No pudimos encontrar información automática — completa los campos manualmente") y el usuario continúa el wizard con normalidad. No hay reintento automático.
7. Límite de uso: el frontend lleva un contador de autocompletados disparados en la sesión de wizard actual (empresa + hasta 10 filas de competidores) y deshabilita el botón pasado un máximo de 8 usos por sesión, con un mensaje explicando el límite. Como respaldo del lado servidor (por si el frontend se recarga y el contador se pierde), la ruta aplica un `express-rate-limit` de 20 requests/hora por IP.

## Componentes técnicos

### Backend

**`backend/src/lib/onboardingAutocomplete.ts`** (nuevo)
Exporta `autocompleteCompanyInfo(nombre: string, sitioWeb: string, tipo: 'company' | 'competitor'): Promise<AutocompleteResult>`.
- Construye un prompt corto pidiendo a Claude que busque en la web información pública de `nombre` (`sitioWeb`) y devuelva únicamente JSON con los campos relevantes al `tipo`:
  - `tipo: 'company'` → `{ instagram, facebook, twitter, linkedin, tiktok, industria, pitch }`
  - `tipo: 'competitor'` → `{ instagram, facebook, twitter, linkedin, tiktok, productos, amenazaEstimada }`
- Usa `anthropic.messages.stream(...)` con `tools: [{ type: 'web_search_20250305', name: 'web_search' }]`, recolectando el texto igual que `callClaudeWithSearch` en `reportEngine.ts`.
- Timeout explícito de 25 segundos (usando `AbortController` o una carrera con `Promise.race` contra un timer) — si Claude no responde a tiempo, se aborta y se lanza un error controlado en vez de colgar la request HTTP.
- Sin reintentos automáticos (a diferencia de `callClaudeWithSearch`, que sí reintenta 3 veces ante 529) — si falla, falla, y el usuario decide si reintenta manualmente presionando el botón de nuevo.
- Parseo del JSON de respuesta con el mismo criterio de limpieza que `reportEngine.ts` (quitar backticks de markdown si Claude los agrega).

**Ruta `POST /api/onboarding/autocomplete`** (nueva, en `backend/src/routes/onboarding.ts`)
- Middleware: `requireAuth` + un rate limiter dedicado (`express-rate-limit`, 20 req/hora por IP, definido en `index.ts` igual que `generateLimiter` para reportes).
- Body esperado: `{ nombre: string, sitioWeb: string, tipo: 'company' | 'competitor' }`. Valida que ambos campos de texto sean no vacíos antes de llamar a Claude (400 si faltan).
- Llama a `autocompleteCompanyInfo` y devuelve `200 { success: true, data: {...} }` o `502 { success: false, error: '...' }` si falla.
- No persiste nada en la base de datos — es una operación de solo lectura/sugerencia; el usuario decide si guarda los datos al continuar el wizard normalmente (el guardado real sigue pasando por `/api/onboarding/save` como hoy).

### Frontend (`frontend/app/onboarding/page.tsx`)

**Estado nuevo:**
- Un contador `autocompleteUsesLeft` (inicializado en 8) en el estado del wizard, decrementado en cada llamada exitosa o fallida (cuenta como "uso" aunque falle, para evitar que un loop de reintentos manuales agote el rate limit del servidor).
- Un estado de loading por fila (`autocompletingCompany: boolean`, y para competidores un `Set<number>` o mapa por índice de fila, ya que puede haber varias filas y cada una tiene su propio botón).

**Función `runAutocomplete(nombre, sitioWeb, tipo, onResult)`:**
- Verifica `autocompleteUsesLeft > 0`, si no, no dispara la llamada y muestra el mensaje de límite alcanzado.
- Hace `fetch` a `/api/onboarding/autocomplete` con el Bearer token de sesión (mismo patrón que el resto de llamadas del wizard).
- En éxito, aplica el merge "solo campos vacíos" sobre el estado correspondiente (`data.socialMedia` para empresa, o el objeto de esa fila en `directCompetitors`).
- En error, muestra el mensaje breve (puede reusar el patrón de modal/mensaje ya existente en el wizard, o un toast simple si no hay uno — a definir en el plan de implementación revisando qué patrón de feedback ya usa el archivo).

**UI:**
- Botón "✨ Autocompletar con IA" junto a los campos de nombre/sitio web en el step de empresa — deshabilitado si falta nombre o sitio web, o si `autocompleteUsesLeft <= 0`.
- Mismo botón, más pequeño, en cada fila de `directCompetitors` (junto a `emptyCompetitor()` — el componente que renderiza cada fila).

## Manejo de errores

- **Timeout de Claude:** el backend responde 502 antes de que el usuario espere indefinidamente; el frontend nunca debe quedar en estado de carga más de ~25-27 segundos.
- **JSON inválido de Claude:** se captura en el backend, se loguea el texto crudo (para debug, igual que `reportEngine.ts` hace con `console.error('❌ Error parseando JSON de Claude:', ...)`), y se responde 502 genérico al frontend — nunca se expone el error crudo de parseo al usuario.
- **Rate limit alcanzado (servidor):** `express-rate-limit` ya devuelve un JSON de error consistente con el patrón existente (`{ error: 'Demasiadas solicitudes...' }`); el frontend lo muestra igual que cualquier otro error de autocompletado.
- **Límite de sesión alcanzado (frontend):** el botón se deshabilita proactivamente antes de llegar a disparar una request innecesaria, con un mensaje visible de por qué.

## Validación

Sin test runner en el proyecto (confirmado en trabajo previo de esta misma rama base). La validación es manual:
1. `npx tsc --noEmit` en `backend/` tras cada cambio.
2. Prueba directa del endpoint con `curl` contra el backend de staging, usando una empresa real conocida (ej. una marca mexicana pública) para confirmar que el JSON devuelto tiene información real y no alucinada.
3. Prueba en el navegador contra el entorno de staging ya armado (Supabase + backend + frontend locales, según se dejó configurado en la sesión de hardening de seguridad): llenar nombre + sitio web reales de una empresa y de al menos un competidor, presionar autocompletar, confirmar que los campos se llenan correctamente y que un campo ya escrito a mano no se sobreescribe.
4. Prueba de error: usar un nombre/sitio web sin presencia web real o inválido, confirmar que el mensaje de fallo aparece y el wizard sigue siendo usable.
