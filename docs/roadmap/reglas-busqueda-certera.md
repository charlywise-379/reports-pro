# Reglas para una investigación web certera y estable (motor de reportes)

Documento de diseño. No implementa nada: define las reglas que después se llevan al prompt, al código y a la
configuración de la llamada. Fecha de análisis: 6 de noviembre de 2026. Rama: `feat/reporte-auto-pago`.

Archivos analizados:

- `backend/src/lib/reportEngine.ts` (`callClaudeWithSearch`, líneas 148-270; `generateReport`, 902-1025)
- `backend/src/lib/reportPrompts/competitivePromptV2.ts` (FASE 1-4, Regla de Frescura, niveles E0-E3, autoverificación)
- `backend/src/lib/reportScoring.ts` (pesos fijos) y `backend/src/lib/reportEnforcement.ts` (topes por evidencia)
- `backend/src/lib/reportFixtures.ts` (`FIXTURE_DATE_INFO`, `FIXTURE_PROJECT_REAL`)
- Corridas: `backend/preview-out/final-test/prev/real/` (Stick-A-Boom, corrida 1), `backend/preview-out/final-test/real/`
  (corrida 2), `backend/preview-out/final-test/prev/almex/` y `backend/preview-out/final-test/almex/` (Almex, corridas 1 y 2).
- Documentación de la API consultada el 6 nov 2026: web search, web fetch, server tools, structured outputs (ver sección D).

---

## A. Diagnóstico confirmado

### A.1 Qué cambió entre las dos corridas de Stick-A-Boom

Las métricas se calculan con pesos fijos (`reportScoring.ts`), así que toda la diferencia viene de la evidencia que la IA
entregó. Descomposición de la presión competitiva (`0.4·amenaza + 0.35·actividad + 0.25·alertas`), tomada de
`data.json` de cada corrida:

| Componente | Corrida 1 | Corrida 2 | Aporte a la diferencia |
|---|---|---|---|
| Amenaza (promedio top-3 threat /10) | 87 % (10, 8, 8) | 63 % (7, 6, 6) | ≈ 9.6 pts |
| Actividad (cambios ponderados + movimientos) | 71 % (9 cambios: 2 CRÍTICO, 2 ALTO, 4 MEDIO, 1 BAJO; 4 competidores con movimiento) | 32 % (6 cambios: 1 CRÍTICO, 1 ALTO, 2 MEDIO, 2 BAJO; 0 movimientos) | ≈ 13.7 pts |
| Alertas | 70 % (3 CRÍTICAS + 3 medias) | 60 % (1 CRÍTICA, 2 ALTAS, 3 medias) | ≈ 2.5 pts |
| **Presión** | **77** | **52** | **25 pts** |

Las otras dos métricas se movieron igual de fuerte: oportunidad 86 → 71 y riesgo de mercado 77 (CRÍTICO) → 37 (MEDIO).
En Almex: presión 76 → 68, riesgo 78 (CRÍTICO) → 50 (MEDIO), señales 34 → 21.

### A.2 Causas, ordenadas por impacto

**1. Hechos no observables aceptados como evidencia E3/E2 (impacto: amenaza y actividad, ~15 pts de presión).**
La herramienta `web_search` devuelve páginas indexadas (url, título, fragmento, `page_age`); no ve anuncios, posiciones
de la página de resultados, publicaciones de Instagram, seguidores, interacciones ni reseñas de Google Maps. Sin embargo
la corrida 1 las usó como base de los valores más altos:

- Sticker Mule, `threatFactors.move = 3`, `threatBasis` "E3 · … campaña activa en Google Ads México detectada 6 nov 2026
  … promoción envío gratis >$500 MXN"; alerta "Fuente: Google Ads"; riesgo alto "posiciones 1-2 para búsquedas clave"
  (p = 75, i = 7). Resultado: threat 10 → riskLabel CRÍTICO → cambio CRÍTICO + alerta CRÍTICA + riesgo alto. La corrida 2
  dijo "Sin datos públicos disponibles" (threat 7). Esa sola inferencia explica ≈ 1/3 de la diferencia.
- Creatify, `move = 2`, "publicó 4 veces en Instagram 28 oct-4 nov … 150+ interacciones", `followersEstimate: 3,200`,
  `growth: "↑ subió en engagement · +20% interacciones"`. Corrida 2: "Sin presencia digital detectada", digital 0.
- Almex corrida 1: Castores "12 reseñas nuevas 4-6 nov en Google Maps mencionando precio", seguidores 48,500 / 87,200 /
  156,000 con precisión de cuatro cifras; Tresguerras corrida 2: `move = 2` E3 por "fortalecimiento de posicionamiento
  SEO … presencia top" (la propia regla del prompt lo prohíbe como dato duro).

El código no puede detectarlo hoy: `evidenceOf()` solo lee el prefijo "E3" que escribe el modelo; no hay ningún campo con
URL, fecha ni cita que se pueda contrastar.

**2. Ventana temporal ambigua (impacto: movimientos de todos los competidores → 0 en la corrida 2).**
El fixture manda `PERIODO DEL REPORTE: 8 oct 2026 al 15 oct 2026` mientras `HOY ES` el 6 de noviembre. La corrida 2 tomó el
periodo al pie de la letra: `threatBasis` "Sin movimientos detectados periodo 8-15 oct", `marketStatusDesc` "Durante el
periodo 8-15 octubre 2026 no se detectaron lanzamientos…". La corrida 1 ignoró el periodo y evaluó "esta semana" (5-6 nov).
Es un artefacto de prueba (`generateReport` sí calcula el periodo desde `now`), pero demuestra que el prompt mezcla tres
ventanas sin jerarquía: Regla de Frescura (7 / 30 días), rúbrica de movimiento ("E3 de esta semana" vs "último mes") y
definición de E3 ("últimos 30 días"). Hay que fijar una sola ventana explícita y derivar todo de ella.

**3. Cobertura de búsqueda no determinista (impacto: qué competidores "tienen" evidencia).**
`searchQueries` (reportEngine.ts 154-162) se construye y nunca se envía: código muerto. El modelo decide qué buscar; el
sistema pide "mínimo 10 búsquedas" sin verificar. Evidencia: corrida 1 citó 8 URLs distintas (incluida
`instagram.com/creatifymx/`), corrida 2 citó 4; Almex 7 vs 3. La alianza Estafeta-Amazon (El Economista, 25 oct) y las
vacantes de Tresguerras aparecen solo en la corrida 1; la misma promoción de Castores lleva fechas distintas ("4-30 nov" vs
"desde 1 nov"). No hay piso, techo ni lista fija de consultas.

**4. Fuentes sin URL verificable y sin registro (impacto: imposibilidad de auditar).**
Todas las URLs citadas son portadas (`stickermule.com/mx`, `pegalinas.com`, `castores.com.mx/`), no la página donde está el
hecho. Fuentes como "Google Ads", "búsquedas Google ejecutadas para análisis", "Búsqueda manual Instagram, Facebook",
"revisión de sitios web competidores" no apuntan a nada. El `searchLog` (consultas y resultados) solo se imprime recortado a
5,000 caracteres en consola (línea 230) y no se guarda, así que no se puede comprobar que una URL citada salió de una
búsqueda real de esa corrida.

**5. Observaciones de estado y brechas propias contadas como actividad competitiva (impacto: ~1-2 pts por elemento, sesgo
constante).** Ejemplos que entraron a `changesCol*` y suman en `activity`: "Castores mantiene frecuencia semanal en redes"
(BAJO), "Stickeria mantiene publicación semanal en Instagram" (ALTO, y el sistema creó una alerta ALTA a partir de él),
"Sticker Mule domina primeras posiciones orgánicas" (MEDIO), "Sin cambios de precio detectados en competidores" (BAJO: la
ausencia de cambio contada como cambio). Además "Stick-A-Boom sin indexación en Google" entra como cambio CRÍTICO con peso 1.0
en la actividad de *la competencia*, en las dos corridas. La corrida 1 de Almex tiene 4 cambios BAJO de este tipo.

**6. Sin memoria de evidencia entre ediciones.** El reporte anterior solo aporta `metricsJson` (señales y presión) para el
"vs anterior". Un hallazgo fuerte (promoción de Castores, alianza Estafeta) puede desaparecer la semana siguiente sin que
nadie distinga "terminó" de "no se buscó". Hoy el delta "vs anterior" mezcla cambios reales del mercado con cambios de
cobertura.

**7. Configuración de la llamada desactualizada.** `model: 'claude-sonnet-4-5'` (deprecado; la tabla de modelos de la skill
claude-api lo marca con retiro el 30 nov 2026; confirmar en la página de deprecaciones), `web_search_20250305` sin
`max_uses`, `user_location` ni `allowed_callers`, sin `web_fetch`, prefill `{ role: 'assistant', content: '{' }` (los
modelos 4.6+ lo rechazan con 400 y es incompatible con structured outputs), sin `output_config.effort`. Sobre
`temperature`: no es una palanca disponible. En Claude Opus 5.5 y Sonnet 5.5 los parámetros de muestreo distintos del
valor por defecto devuelven 400, y con la versión de API `2026-10-21` cualquier `temperature` devuelve 400 en todos los
modelos. La estabilidad tiene que venir del proceso (consultas fijas, reglas de evidencia aplicadas por código), no del
muestreo.

**8. Menor: aritmética de la rúbrica.** En Almex corrida 2 los 9 `threat` declarados venían 1 punto por debajo de la suma
(olvidó el punto base); el sistema ya los corrige (`threatsAdjusted: 9`). No afecta la estabilidad pero confirma que el
código debe ser la única fuente de los números.

---

## B. Reglas de búsqueda (cobertura estable y reproducible)

### B.1 Principio

El **código** genera el plan de consultas a partir del `setup` del proyecto (determinista: mismo cliente → mismas
consultas); el **modelo** las ejecuta todas, puede añadir un número acotado de consultas de profundización, y el código
**verifica** la cobertura contra el registro de búsquedas antes de aceptar la respuesta.

### B.2 Ventana de fechas (una sola, explícita)

- `T0` = fecha y hora de generación en `America/Mexico_City` (la misma que `HOY ES`). Es la única ancla.
- **Ventana del reporte** = `[T0 − 7 días, T0]` → etiqueta "Esta semana". Es la que habilita `move = 3`, cambios CRÍTICO y
  alertas CRÍTICA por "campaña activa".
- **Ventana E3** = `[T0 − 30 días, T0]` → "Reciente · [fecha]". Habilita `move = 2`, nivel ALTO, probabilidad 70-89.
- **Ventana E2 por fecha** = `[T0 − 90 días, T0 − 31 días]` o hecho anunciado con fecha futura.
- Más antiguo → "Referencia histórica · [mes y año]", nunca suma puntos de movimiento.
- Un hecho **sin fecha legible** (ni en la página ni en `page_age`) no puede ser E3; máximo E2.
- `PERIODO DEL REPORTE` del prompt se deriva de `T0` en el mismo lugar donde se arma la llamada. Los fixtures de render
  (`FIXTURE_DATE_INFO`) nunca deben usarse para una llamada a la IA; si un script lo hace, debe recalcular el periodo
  desde `now` (como ya hace `scripts/generate-real-report.ts`).

### B.3 Idioma y país

- Consultas en español de México; nombres de marca entre comillas y tal cual los registró el cliente.
- `user_location: { type: 'approximate', city: setup.city || 'Ciudad de México', region: setup.state (si existe),
  country: 'MX', timezone: 'America/Mexico_City' }`.
- Sin `allowed_domains` (restringiría de más y falla si la organización tiene listas en Console); `blocked_domains` solo
  para ruido comprobado en el registro (p. ej. agregadores de cupones), revisado cada trimestre.

### B.4 Plan de consultas fijo (orden de ejecución)

Para `N ≤ 5` competidores directos registrados, `giro` = `inferBusinessType(setup)` acortado a ≤ 4 palabras, `ciudad` =
`setup.city || 'México'`, `mes` = mes y año de `T0`.

| Bloque | Consulta exacta (plantilla) | Qué busca | Por qué |
|---|---|---|---|
| 1. Competidor (×N) | `"<nombre>" <ciudad o México>` | dominio real, novedades generales, page_age | identidad y presencia |
| | `"<nombre>" precios OR promoción OR descuento <año>` | precios publicados, promociones vigentes | área "Precios/Promociones" |
| | `"<nombre>" nuevo OR lanzamiento OR vacantes OR alianza OR sucursal <mes>` | movimientos fechados | rúbrica de movimiento |
| 1b. Fetch (×N, si hay URL registrada) | `web_fetch(<url registrada>)` y, si existe en el sitio, su página de promociones/precios | precios y promos observables directamente | evidencia primaria, no inferida |
| 2. Sector (3) | `<giro> México noticias <mes>` · `<giro> <ciudad> <mes>` · `<industria> México regulación OR tendencia <año>` | contexto, regulación, nuevos jugadores | riesgos externos y cambios de mercado |
| 3. Cliente (2) | `"<cliente>"` · `<giro> <ciudad>` | presencia/ausencia del cliente y de cada competidor en los resultados | fila SEO del benchmark (solo presencia/ausencia) |
| 4. Secundarios (2) | `<giro> <ciudad> empresas` · `<giro> México tienda en línea` (o equivalente del sector) | competidores no registrados | `secondaryCompetitors` reales |

Total fijo con 5 competidores: 15 + 3 + 2 + 2 = **22 búsquedas** y hasta 5 fetch de portadas.

### B.5 Mínimos y máximos

- **Mínimo:** las 22 consultas fijas (o `3N + 7`). El código las reconoce en el registro por coincidencia difusa (nombre del
  competidor normalizado + una palabra clave del bloque). Si falta alguna, se continúa la conversación con un mensaje de
  usuario que lista las faltantes (el modelo recibe los resultados previos; ver D.6) antes de pedir el JSON.
- **Profundización:** hasta 6 búsquedas libres (para fechar un hallazgo o localizar la fuente primaria) y hasta 5 fetch
  adicionales de páginas que aparecieron en los resultados.
- **Techo:** `max_uses: 28` en `web_search` y `max_uses: 10` en `web_fetch`. Costo: web search cuesta USD 10 por cada
  1,000 búsquedas (≈ USD 0.28 por reporte al techo); web fetch no tiene cargo adicional, solo tokens.
- Una búsqueda que falla cuenta para `max_uses` pero no se cobra; el código la registra con su `error_code`.

### B.6 Reglas de ejecución para el modelo (van en el prompt)

1. Ejecutar el plan completo **antes** de escribir una sola conclusión; no abandonar un competidor por "no aparece" sin
   agotar sus 3 consultas.
2. Cada hallazgo que vaya a puntuar debe terminar en una **página concreta** (resultado de búsqueda o fetch). Si el hecho
   está en la portada (banner de promoción), hacer fetch de la portada y citar esa URL con la fecha visible.
3. Un hecho de "esta semana" exige fecha explícita en la página o `page_age` dentro de la ventana del reporte.
4. Prohibido buscar en Instagram/Facebook/TikTok/LinkedIn como fuente de métricas; si una búsqueda devuelve una publicación
   pública con fecha, puede citarse esa URL como E2 (sin seguidores ni interacciones).
5. Las búsquedas del bloque 3 sirven **solo** para "aparece / no aparece"; nunca para posiciones.

---

## C. Reglas de evidencia verificable

### C.1 Nuevo campo obligatorio por elemento puntuado

Todo elemento que aporta puntos (competidor con `move ≥ 1`, cambio, alerta CRÍTICA/ALTA, oportunidad con `demand ≥ 25`,
riesgo alto, precio con ↑/↓) lleva:

```json
"evidence": {
  "url": "https://www.castores.com.mx/promociones",   // página concreta, no solo el dominio
  "date": "2026-11-04",                               // fecha del hecho (ISO); null si no es legible
  "quote": "15% de descuento en LTL Monterrey-CDMX del 4 al 30 de noviembre",  // ≤ 150 caracteres, textual
  "via": "search" | "fetch",                          // de dónde salió la URL en esta corrida
  "observed": "precio" | "promocion" | "nota_prensa" | "vacante" | "pagina_nueva" | "comunicado" | "registro_oficial" | "publicacion_fechada" | "sectorial"
}
```

Los campos `*Basis` se conservan (justificación legible), pero el nivel que cuenta lo **calcula el código**.

### C.2 Definición operativa de cada nivel

| Nivel | Condiciones (todas) | Habilita |
|---|---|---|
| **E3** | `url` está en el registro de esta corrida (búsqueda o fetch) · `date` legible y dentro de 30 días · `observed` es un hecho observable (no está en la lista negra C.3) · `quote` no vacía | `move = 3` si `date` ∈ ventana del reporte, si no `move = 2`; cambio CRÍTICO; alerta CRÍTICA; probabilidad 90-100; `demand = 40` |
| **E2** | `url` en el registro · (`date` entre 31 y 90 días, o fecha futura anunciada, o `date` null) · hecho observable | `move ≤ 2` (≤ 1 si `date` null); cambio ALTO; alerta ALTA; probabilidad ≤ 89; `demand ≤ 25` |
| **E1** | sin URL del competidor pero con URL sectorial en el registro, o patrón en ≥ 2 resultados del registro | `move ≤ 1`; cambio MEDIO; alerta media; `demand ≤ 10`; no entra en riesgos altos |
| **E0** | sin URL en el registro, o URL que no apareció en esta corrida, o hecho de la lista negra sin URL | no puntúa: `move = 0`, el cambio se excluye, la alerta baja a media, el riesgo baja a medio, la oportunidad queda con `demand = 0` |

Nivel efectivo = `min(nivel declarado en *Basis, nivel calculado)`. Si el modelo declara E3 y el código calcula E1, se
aplica E1 y queda en `audit.evidenceAdjustments` con la regla que falló.

### C.3 Lista negra: afirmaciones no observables con web search

Si el texto de `recentMove`, `*Basis`, `title`, `description`, `detected`, `source` o `growth` contiene alguno de estos
patrones **y** el elemento no trae una URL del registro cuyo `quote` lo respalde, el elemento se degrada a E0 (o E1 si es
sectorial). Patrones (sin acentos, minúsculas; se implementan como una sola expresión regular en `reportEnforcement.ts`):

- publicidad: `google ads`, `anuncio(s)`, `campaña (activa|pagada)`, `inversión publicitaria`, `pauta`
- posiciones: `posicion(es)? ?[0-9]`, `top ?[0-9]`, `primeras posiciones`, `domina (las )?búsquedas`, `serp`, `ranking`
- redes: `seguidores`, `followers`, `engagement`, `interacciones`, `publicó [0-9]+ veces`, `frecuencia (semanal|diaria)`,
  `posts?`, `reels?`, `stories`, `likes`
- reseñas: `rese[ñn]as? (nuevas|en google|en maps)`, `google maps`, `calificación [0-9]`
- cifras sin fuente: `\+?[0-9]+ ?%` sin URL en el registro; `estimado`, `aproximadamente [0-9]`
- fuentes vacías: `búsquedas? (google )?ejecutadas?`, `búsqueda manual`, `revisión de (sitios|redes)`, `verificación directa`,
  `análisis de posts`

Excepciones: la fila "SEO / Posicionamiento Google" del benchmark y `socialMedia.*` **no puntúan** (no entran en
`computeScores`), así que ahí se permite "Aparece en resultados / No aparece / Sin verificar" y "No detectado". El prompt
debe pedir "No detectado" por defecto en `followersEstimate`, `engagementLevel` y `lastPostDate`.

### C.4 Qué es movimiento y qué no

- Movimiento = cambio con fecha: nuevo precio, promoción con vigencia, lanzamiento, vacante publicada, alianza, apertura,
  comunicado, cambio de catálogo visible en una página fechada.
- No es movimiento (→ `move = 0`, no entra en `changes`): "mantiene", "sigue", "domina", "continúa", "sin cambios", "no se
  detectaron", descripciones del estado del sitio o de las redes. Ampliar la expresión `NO_DATA` de `reportScoring.ts`
  con `mantiene|sigue|continúa|domina|sin cambios de precio|no se detect` y aplicarla también al título de cada cambio.
- Brechas propias del cliente ("<cliente> sin…", "<cliente> no aparece…") **no** suman en `activity` ni en
  `competitorMoves`; siguen generando la alerta CRÍTICA y el área de mejora que ya maneja `enforceRubrics`. Esto es un cambio
  de scoring → `SCORING_VERSION = 2`.

### C.5 Contraste de URLs contra el registro de búsquedas

1. Durante el stream se capturan: cada `server_tool_use` (`id`, `name`, `input.query` o `input.url`), cada
   `web_search_tool_result` (lista de `{url, title, page_age}` o el objeto de error con `error_code`), cada
   `web_fetch_tool_result` (`url`, `retrieved_at`, título, o error) y las citas `web_search_result_location`
   (`url`, `title`, `cited_text`) adjuntas a los bloques de texto de la respuesta final.
2. Se construye `knownUrls`: URL normalizada (minúsculas, sin `utm_*`, sin `#`, sin `/` final) → `{page_age, queryIds,
   via}`.
3. Para cada `evidence.url`: coincidencia exacta normalizada, o coincidencia de `host + path` ignorando la query string.
   Coincidir solo por dominio **no** vale: una portada registrada no respalda un hecho que está en otra página, salvo que
   `via = 'fetch'` y la URL fetched sea exactamente esa portada.
4. Si la cita nativa (`cited_text`) contiene el `quote` del elemento, el elemento recibe la marca `verified: true` (prueba
   más fuerte); si `evidence.date` es null pero `page_age` del resultado está dentro de la ventana, se usa `page_age` como
   fecha con marca `dateFrom: 'page_age'`.
5. El registro completo se persiste (sección E.1) y se adjunta al reporte como `metricsJson.search` (resumen) para que
   soporte pueda responder "de dónde salió esto".

### C.6 Qué hace el código cuando no se cumple

Mismo mecanismo que hoy (`capped()` en `reportEnforcement.ts`), con la diferencia de que el nivel entra calculado:

- `move` por encima del tope → se recorta y se recalcula `threat` y `riskLabel`.
- Cambio con nivel superior al permitido → se baja el nivel; E0 → se excluye.
- Alerta CRÍTICA/ALTA con E1/E0 → pasa a `mediumAlerts`.
- Riesgo alto con E1/E0 → pasa a `mediumRisks` sin número.
- Oportunidad: `demand` se recorta al permitido.
- `priceTrends` con ↑/↓ sin evidencia válida → "→ Sin cambios verificables".
- Cada ajuste queda en `audit.evidenceAdjustments` con `{item, rule: 'url-no-registrada' | 'sin-fecha' | 'no-observable' |
  'estado-no-movimiento', from, to}`. Si más del 40 % de los elementos puntuados cae a E0, el reporte se marca
  `evidenceQuality: 'baja'` y la portada muestra "Semana con poca evidencia verificable" en vez de inventar actividad.

---

## D. Configuración de la llamada

Fuentes consultadas el 6 nov 2026: `platform.claude.com/docs/en/agents-and-tools/tool-use/web-search-tool`,
`…/web-fetch-tool`, `…/server-tools`, `platform.claude.com/docs/en/build-with-claude/structured-outputs`, y la skill
`claude-api` (tabla de modelos con caché del 2026-10-06, `shared/models.md`, `shared/api-version-migration.md`).
SDK instalado: `@anthropic-ai/sdk` 0.91.1 (ya tipa `web_search_20260209`, `web_fetch_20260209`, `user_location`,
`output_config.effort` y `pause_turn`; no tipa `web_search_20260318`).

### D.1 Modelo

| Opción | Precio (entrada/salida por MTok) | Notas |
|---|---|---|
| **`claude-opus-5-5`** (recomendado) | USD 4 / 20 | Modelo por defecto que indica la skill. Pensamiento siempre activo; `output_config.effort` por defecto `medium` → fijar `high`. Admite web search/fetch con filtrado dinámico y structured outputs. |
| `claude-sonnet-5-5` (alternativa a medir) | USD 2 / 10 | Mismo soporte de herramientas; effort por defecto `high`. Decidir con la prueba de estabilidad (sección F), no por precio a priori. |
| `claude-sonnet-4-5` (actual) | — | Deprecado, retiro 30 nov 2026 según `shared/models.md` de la skill; confirmar en la página de deprecaciones antes de esa fecha. Hay que migrar en cualquier caso. |

Implicaciones de la migración (ambos candidatos): quitar el prefill `{ role: 'assistant', content: '{' }` (400 en modelos
4.6+); no enviar `temperature`/`top_p`/`top_k` (400); `tool_choice` `any`/`tool` no está disponible (400) → la obligación de
buscar se consigue con el prompt + verificación de cobertura, no forzando la herramienta; manejar `stop_reason:
'refusal'` y `'pause_turn'`.

### D.2 Herramientas

```ts
tools: [
  {
    type: 'web_search_20260209',
    name: 'web_search',
    max_uses: 28,
    allowed_callers: ['direct'],   // sin filtrado dinámico: bloques de resultado planos y auditables, elegible a ZDR
    user_location: { type: 'approximate', city, region, country: 'MX', timezone: 'America/Mexico_City' },
  },
  {
    type: 'web_fetch_20260209',
    name: 'web_fetch',
    max_uses: 10,
    allowed_callers: ['direct'],
    citations: { enabled: true },
    max_content_tokens: 20000,
  },
]
```

Justificación, con la documentación:

- `web_search_20260209` es la versión vigente para modelos 4.6+; `web_search_20250305` sigue disponible pero no hay motivo
  para quedarse. `web_search_20260318` añade `response_inclusion` (irrelevante aquí; requiere actualizar el SDK).
- `allowed_callers: ['direct']`: en `_20260209` el valor por defecto es `["code_execution_20260120"]` (filtrado dinámico:
  el modelo escribe código que filtra los resultados). Eso añade una fuente de variación y anida los bloques de resultado
  dentro de ejecuciones de código. Para auditar consultas y URLs conviene empezar en modo directo; el filtrado dinámico se
  puede probar después como optimización de tokens y medirlo con la sección F.
- `max_uses` es el único límite que la API aplica; no existe mínimo. El piso se verifica en código con
  `usage.server_tool_use.web_search_requests` y con el conteo de `server_tool_use` del registro.
- `user_location.country` debe ser código ISO 3166-1 alpha-2 (`MX`); un código no soportado devuelve 400. Se puede dar al
  menos uno de `city`, `region`, `country`, `timezone`.
- `allowed_domains` y `blocked_domains` no se combinan (400). Los dominios van sin esquema; los subdominios se incluyen
  automáticamente; en web search se permiten rutas (`example.com/blog`); en web fetch solo dominio. Las listas a nivel de
  solicitud deben ser subconjunto de las listas de la organización en Console.
- `web_fetch` solo puede abrir URLs que ya aparecieron en la conversación: mensajes de usuario, resultados de herramientas
  del cliente y resultados previos de web search/fetch. **No** las del system prompt. Por eso las URLs registradas de los
  competidores deben ir en el mensaje de usuario (ya van: lista "COMPETIDORES REGISTRADOS"). No renderiza JavaScript: una
  tienda SPA puede devolver poco contenido; el modelo debe reportar "página sin contenido legible" y no inferir.
- Las citas de web search están siempre activas (`web_search_result_location` con `url`, `title`, `cited_text` ≤ 150
  caracteres); las de web fetch hay que activarlas (`citations: { enabled: true }`). `cited_text`, `title` y `url` de las
  citas no cuentan como tokens.
- Errores de herramienta llegan con HTTP 200 dentro del bloque de resultado: `content` es un **objeto**
  (`web_search_tool_result_error` con `error_code`: `max_uses_exceeded`, `too_many_requests`, `query_too_long`,
  `request_too_large`, `invalid_tool_input`, `unavailable`) en vez de la lista de resultados. Una búsqueda sin resultados
  devuelve lista vacía, no error. El registro debe distinguir los tres casos.

### D.3 Parámetros del modelo

- `max_tokens: 32000` con streaming (ya se hace). Si se adopta la fase de síntesis separada (D.6), 24000 bastan para el JSON.
- `output_config: { effort: 'high' }` explícito (en Opus 5.5 el valor por defecto es `medium`).
- `thinking`: omitir (Opus 5.5 lo trae siempre; `{type:'adaptive'}` es equivalente). No pedir al modelo que "razone" dentro
  del JSON: los `*Basis` son justificación de una oración, no cadena de pensamiento.
- Sin `temperature`, `top_p`, `top_k` (ver A.2 punto 7).
- Prompt caching: colocar primero lo estable (system prompt, reglas, esquema JSON) y después lo variable (fecha, cliente,
  plan de consultas, memoria), con un `cache_control` al final de la parte estable. Cualquier byte que cambie antes del
  marcador invalida la caché; la fecha `HOY ES` debe quedar después del marcador.
- Opcional: `fallbacks: 'default'` con `betas: ['server-side-fallback-2026-07-01']` para que un `refusal` de clasificador
  se reenrute a otro modelo en vez de fallar el job (la skill lo recomienda por defecto en Opus 5.5).

### D.4 Manejo de paradas

- `pause_turn`: reenviar el contenido del asistente tal cual, con las **mismas** herramientas, y seguir hasta otro
  `stop_reason` (tope de 3 continuaciones). Un bloque `server_tool_use` sin resultado en una respuesta pausada se ejecuta
  al inicio de la siguiente solicitud.
- `max_tokens`: reintentar como hoy, pero conservar el registro de búsquedas de cada intento (las búsquedas sí se cobraron).
- `refusal`: no reintentar igual; registrar `stop_details.category` y fallar el job con mensaje claro.
- 529/429: la espera exponencial actual está bien; añadir lectura de `retry-after`.

### D.5 Streaming y captura del registro

Los bloques de resultado llegan completos en un solo `content_block_start` (sin deltas); la consulta llega como
`input_json_delta` dentro del bloque `server_tool_use`. Hoy el código lee `block.input` en `content_block_start`, donde el
input todavía viene vacío en streaming: hay que acumular `partial_json` por índice de bloque y parsearlo en
`content_block_stop` (o leer `finalMessage().content`, que ya trae todo armado; lo más simple es construir el registro
desde `finalMessage` y usar el stream solo para el texto).

### D.6 Arquitectura recomendada: dos fases en una conversación

La documentación de structured outputs marca `output_config.format` como **incompatible con citas** (400) y las citas de
web search están siempre activas, así que no se debe asumir que el JSON forzado por esquema funciona en la misma solicitud
que `web_search`. Además, mezclar investigación y redacción en un solo turno es lo que permite al modelo "rellenar" cuando
la evidencia no alcanza. Diseño:

1. **Fase A — Investigación** (herramientas activas, sin esquema): el modelo ejecuta el plan de consultas y termina con una
   lista de hallazgos en texto estructurado simple (un hallazgo por línea: competidor · hecho · fecha · URL · cita). El
   código verifica cobertura (B.5) y, si falta, continúa la conversación pidiendo las consultas faltantes.
2. **Fase B — Síntesis** (sin herramientas, `output_config.format` con el esquema JSON del reporte incluyendo `evidence`):
   el código envía un mensaje de usuario con el **dosier de evidencia** que él mismo construyó del registro (consulta →
   URLs con título, `page_age` y `cited_text`) más la lista de hallazgos de la fase A, y pide el JSON. Al no replicar los
   bloques de herramienta en el historial se evita la incompatibilidad y se garantiza que la única evidencia disponible
   para redactar es la registrada. Si en el piloto la API aceptara el historial con resultados de búsqueda y el esquema a la
   vez, se puede simplificar a una sola conversación continua; se decide con una prueba, no por suposición.
3. Ventaja adicional: la fase B es determinista en estructura (esquema estricto, `additionalProperties: false`), elimina el
   parseo frágil de llaves y el `stripCitationTags`, y permite reintentar solo la síntesis si el JSON viene truncado sin
   volver a pagar búsquedas.

Costo estimado por reporte (orientativo, a confirmar en la prueba F): 22-28 búsquedas ≈ USD 0.25-0.28; tokens con Opus 5.5
≈ USD 1.0-1.5 (entrada ~150-200k con resultados, salida ~25k); con Sonnet 5.5 ≈ la mitad.

---

## E. Memoria entre ediciones

### E.1 Qué se guarda por reporte

Nuevo campo `Report.evidenceJson` (Json, nullable; migración Prisma) con:

```json
{
  "generatedAt": "2026-11-06T13:00:00-06:00",
  "window": { "reportStart": "2026-10-30", "e3Start": "2026-10-07" },
  "search": {
    "planVersion": 1,
    "queries": [{ "id": "c1-sticker-mule-1", "query": "\"Sticker Mule\" México", "block": "competitor", "results": [{ "url": "...", "title": "...", "page_age": "..." }], "error": null }],
    "fetches": [{ "url": "...", "retrieved_at": "...", "ok": true }],
    "coverage": { "planned": 22, "executed": 22, "missing": [] },
    "usage": { "web_search_requests": 24, "web_fetch_requests": 6 }
  },
  "findings": [
    { "id": "f-castores-promo-15", "competitor": "Transportes Castores", "kind": "promocion", "title": "15% LTL Monterrey-CDMX",
      "url": "https://www.castores.com.mx/promociones", "date": "2026-11-04", "validUntil": "2026-11-30", "level": 3,
      "contributed": { "move": 3, "change": "CRÍTICO", "alert": "CRÍTICA", "highRisk": true } }
  ]
}
```

`metricsJson` conserva lo que ya tiene y añade `evidenceQuality` y `coverage` (para que el "vs anterior" sepa si las
ediciones son comparables).

### E.2 Qué se inyecta en la siguiente edición

El código toma del reporte anterior los **hallazgos fuertes**: `level ≥ 2` que aportaron `move ≥ 2`, cambio CRÍTICO/ALTO,
alerta CRÍTICA/ALTA o riesgo alto (máximo 8, ordenados por aporte). Los pone en el prompt como bloque
`SEGUIMIENTO OBLIGATORIO DE LA EDICIÓN ANTERIOR` y añade al plan de consultas, por cada uno: un `web_fetch` de la URL
guardada y una búsqueda `"<competidor>" <palabra clave del hallazgo> <mes>`. El modelo debe clasificar cada uno con un
campo `followUp[]` en el JSON:

| Estado | Condición | Efecto en la puntuación |
|---|---|---|
| `VIGENTE` | la URL original o una nueva del registro sigue mostrando el hecho | cuenta como movimiento E3/E2 del último mes (`move = 2`), no como "esta semana"; no vuelve a ser CRÍTICO salvo hecho nuevo |
| `CONCLUIDO` | evidencia de fin: vigencia vencida (`validUntil` < T0), página retirada (fetch 404 o sin el texto), comunicado de cierre | `move = 0`; genera un cambio informativo "Terminó …" nivel BAJO/MEDIO según impacto; se cierra el hallazgo |
| `NO_REUBICADO` | se buscó (consulta + fetch en el registro) y no se encontró ni el hecho ni su fin | se conserva una edición como E2 con `move ≤ 1`, marcado en el reporte como "no se pudo reconfirmar esta semana"; si en la siguiente edición sigue así, se cierra |
| `NO_BUSCADO` | el código no encuentra en el registro la consulta ni el fetch de seguimiento | no lo decide el modelo: el código fuerza la continuación de la fase A; si aun así falta, se trata como `NO_REUBICADO` y queda en auditoría |

Así "ya no ocurre" (CONCLUIDO) se distingue de "no se buscó" (NO_BUSCADO) y de "se buscó y no apareció" (NO_REUBICADO), y
un hallazgo fuerte nunca desaparece en silencio: o se reconfirma, o se cierra con evidencia, o el reporte dice que no se
pudo reconfirmar.

### E.3 "Vs anterior" honesto

`computeDeltas` solo compara cuando `scoringVersion` coincide **y** `coverage.executed / coverage.planned ≥ 0.9` en ambas
ediciones; si no, muestra "Cobertura distinta: sin comparación" en lugar de un porcentaje. El texto de tendencia debe
decir cuántos hallazgos de la edición anterior siguen vigentes, cuántos concluyeron y cuántos son nuevos (eso es
información para el cliente; un +25 % de señales sin ese contexto no lo es).

---

## F. Cómo medir la estabilidad

### F.1 Protocolo

- Script nuevo `backend/scripts/stability-test.ts` (solo lectura de la BD; escribe en `backend/preview-out/stability/<cliente>/<run-k>/`
  `aiData.json`, `searchLog.json`, `metrics.json`, `audit.json`, y un `summary.json` por cliente).
- Clientes: Stick-A-Boom (`FIXTURE_PROJECT_REAL`) y Almex como mínimo; después uno de servicios locales (giro distinto).
- `N = 5` corridas consecutivas del mismo cliente en menos de 2 horas, con `T0` **congelado** (misma fecha y periodo en el
  prompt para las 5) para que ninguna diferencia venga de la ventana.
- Repetir el bloque de 5 al día siguiente para separar ruido (intradía) de cambio real del mercado (interdía).
- Comparar configuraciones por pares (modelo A vs B, filtrado dinámico sí/no) solo cambiando una variable.

### F.2 Métricas y umbrales de aceptación

| Métrica | Cómo se mide en las N corridas | Umbral |
|---|---|---|
| Presión, oportunidad, riesgo (0-100) | rango (máx − mín) y desviación estándar | rango ≤ 10 pts y σ ≤ 4 en cada una |
| Nivel de riesgo (BAJO/MEDIO/ALTO/CRÍTICO) | moda | misma categoría en ≥ 4 de 5 |
| `threat` por competidor registrado | rango por competidor | ≤ 2 puntos en todos |
| Conteo de señales | coeficiente de variación | ≤ 25 % |
| Cobertura | consultas fijas ejecutadas / planeadas | 100 % en todas las corridas |
| Conjunto de hallazgos E3 | índice de Jaccard entre pares de corridas (por `competitor + kind`) | ≥ 0.6 promedio |
| Evidencia inválida | elementos degradados por `url-no-registrada` o `no-observable` / elementos puntuados | ≤ 10 % |
| Fuentes | URLs citadas que no están en el registro | 0 |

Como referencia, las dos corridas actuales de Stick-A-Boom dan rango 25 (presión), 15 (oportunidad), 40 (riesgo) y dos
niveles de riesgo distintos: fallan todos los umbrales.

### F.3 Criterio de salida

Se despliega una configuración cuando dos clientes de giros distintos pasan todos los umbrales en dos días seguidos
(20 corridas). Costo aproximado de una evaluación completa: 20 × USD 1.3 ≈ USD 26 con Opus 5.5. Después de desplegar, el
script se corre una vez al mes con un cliente de muestra como regresión.

---

## G. Cambios a implementar, priorizados

Esfuerzo: S ≤ medio día · M ≈ 1 día · L ≈ 2 días. Orden = impacto en estabilidad / esfuerzo.

| # | Cambio | Tipo | Archivos | Esfuerzo |
|---|---|---|---|---|
| 1 | Persistir el registro de búsquedas (consultas, URLs, `page_age`, errores, citas) construido desde `finalMessage`; escribirlo junto al `aiData.json` en previews y en `Report.evidenceJson` en producción | código + BD | `backend/src/lib/reportEngine.ts`, nuevo `backend/src/lib/reportEvidence.ts`, `backend/prisma/schema.prisma` + migración, `backend/scripts/generate-real-report.ts` | M |
| 2 | Campo `evidence` obligatorio en cada elemento puntuado + cálculo del nivel efectivo (C.2), contraste de URLs (C.5), lista negra (C.3) y degradación con auditoría (C.6) | prompt + código | nuevo `backend/src/lib/reportPrompts/competitivePromptV3.ts` (v2 se conserva para revertir, como ya se hace con v1), `backend/src/lib/reportPrompts/index.ts`, `backend/src/lib/reportEnforcement.ts`, `backend/src/lib/reportEnforcement.test.ts`, `backend/src/lib/reportEvidence.ts` | L |
| 3 | Plan de consultas fijo generado por código (B.4), inyectado en el prompt, con verificación de cobertura y continuación de la conversación si faltan consultas; borrar `searchQueries` muerto | código + prompt | nuevo `backend/src/lib/reportPrompts/searchPlan.ts`, `backend/src/lib/reportEngine.ts`, `competitivePromptV3.ts` | M |
| 4 | Configuración de la llamada (D.1-D.4): modelo `claude-opus-5-5`, `web_search_20260209` + `web_fetch_20260209` con `max_uses`, `allowed_callers`, `user_location`, `effort: 'high'`, quitar prefill, manejar `pause_turn`/`refusal`; captura correcta del input en streaming (D.5) | configuración + código | `backend/src/lib/reportEngine.ts`, `backend/src/lib/anthropic.ts` | M (S de código, el resto es prueba) |
| 5 | Ventana única (B.2): `T0` → `PERIODO`, ventanas E3/E2 explícitas en el prompt; `FIXTURE_DATE_INFO` nunca llega a una llamada a la IA (recalcular desde `now` en cualquier script que llame a `callClaudeWithSearch`) | prompt + código | `competitivePromptV3.ts`, `backend/src/lib/reportEngine.ts`, `backend/scripts/*.ts` que usen fixtures con IA | S |
| 6 | Scoring v2: excluir de `activity` las observaciones de estado y las brechas propias del cliente; ampliar `NO_DATA`; `SCORING_VERSION = 2` | código | `backend/src/lib/reportScoring.ts`, `backend/src/lib/reportScoring.test.ts`, `backend/src/lib/reportViewModel.test.ts` | S-M |
| 7 | Script de estabilidad (F) con resumen por cliente y umbrales | código | nuevo `backend/scripts/stability-test.ts` | M |
| 8 | Memoria entre ediciones (E): cargar `evidenceJson` anterior, bloque de seguimiento en el prompt, consultas/fetch de seguimiento en el plan, estados `followUp`, `computeDeltas` con cobertura | BD + prompt + código | `schema.prisma`, `reportEngine.ts`, `searchPlan.ts`, `competitivePromptV3.ts`, `reportEnforcement.ts`, `reportScoring.ts` | L |
| 9 | Dos fases (D.6): investigación con herramientas → síntesis con `output_config.format` (esquema estricto, Zod + `zodOutputFormat`); eliminar `stripCitationTags` y el parseo de llaves | código + prompt | `reportEngine.ts`, nuevo `backend/src/lib/reportSchema.ts`, `competitivePromptV3.ts` | L |
| 10 | Prompt caching (orden estable → variable, `cache_control`) y lectura de `usage` para costo por reporte en `metricsJson` | configuración | `reportEngine.ts` | S |
| 11 | Portada: "Semana con poca evidencia verificable" cuando `evidenceQuality = 'baja'`; nota de cobertura en "vs anterior" | plantilla | `backend/src/templates/v2/pages/p01-portada.html`, `backend/src/lib/reportTemplates.ts` | S |

Secuencia sugerida: 1 → 4 → 5 → 2 → 3 → 6 → 7 (primera medición con los umbrales de F) → 8 → 9 → 10 → 11. Los cambios 1-7 son
los que atacan directamente las causas 1-5 y 7 del diagnóstico; 8 ataca la causa 6; 9 y 10 consolidan.

Restricciones vigentes para la implementación: `backend/.env` apunta a producción; todas las pruebas de la sección F deben
correr contra fixtures y escribir solo en `preview-out/`, y la migración de `evidenceJson` se aplica en staging antes que
en producción.
