# Nube de Tags Rediseñada — Diseño

**Fecha:** 2026-07-30
**Rama:** `feature/wizard-ai-autocomplete` (continuación del mismo trabajo de optimizaciones del módulo de Inteligencia Competitiva)
**Origen:** ítem de la lista de "Mejoras" — "Mejorar la nube de etiquetas con un aspecto más reading-friendly, actualmente abruma un poco ver tantas etiquetas desordenadas. Podemos implementar un campo de búsqueda que filtre o autocomplete", junto con la lista de 40 industrias nuevas compartida por el usuario.

## Contexto

El step "Tu empresa" del wizard de onboarding (`frontend/app/onboarding/page.tsx`) tiene una sección "Tags activos" (máximo 10) que renderiza `TAGS_LIB` — un array plano de 79 tags — todos a la vez en un `flex-wrap`, sin agrupación visual ni forma de filtrar. El usuario reporta que esto abruma. Se reemplaza por una nueva taxonomía de 40 industrias (provista por el usuario) y se agrega estructura visual + búsqueda.

Durante el brainstorm se descubrió que existe un sistema **separado y no relacionado**, `INDUSTRY_GROUPS`, que alimenta el `<select>` de "Industria" en el mismo step — confirmado explícitamente que queda **fuera de alcance**, sin tocar. También se descartó agregar cualquier nube de tags/industrias a competidores (directos o indirectos) — no existe hoy y el usuario aclaró que no era eso a lo que se refería en la lista original.

## Alcance

**Incluye:**
- Reemplazar el contenido de `TAGS_LIB` por las 40 industrias nuevas, agrupadas en 12 categorías temáticas (agrupación abajo).
- Agregar un campo de búsqueda que filtra los tags visibles en tiempo real, a través de todos los grupos.
- Reestructurar el render para mostrar los tags agrupados por categoría con encabezado, en vez de una sola nube plana.
- Tags dentro de cada grupo en orden alfabético.

**Fuera de alcance (explícito):**
- `INDUSTRY_GROUPS` (el `<select>` de "Industria") — sistema separado, no se toca.
- Cualquier nube de tags/industrias para competidores directos o indirectos — no existe hoy, confirmado que no es parte de este cambio.
- El límite de 10 tags activos y su contador `X/10` — se mantiene sin cambios de comportamiento.

## Taxonomía: 12 grupos, 40 industrias

```
Industria y Manufactura: Manufactura y Ensamble, Automotriz y Movilidad, Automatización e Industria 4.0, Química y Farmacéutica
Logística y Distribución: Logística y Transporte, Última Milla y Delivery, Gestión de Flotas, Almacenamiento y Distribución
Retail y Comercio: Consumo Masivo (FMCG), Retail y Comercio Físico, E-commerce y Marketplaces, Moda y Belleza
Finanzas: Banca y Servicios Financieros, Pagos y Transferencias, Fintech, Insurtech
Tecnología: SaaS B2B / B2C, Inteligencia Artificial y Datos, Ciberseguridad, Infraestructura Cloud y DevOps, Desarrollo de Software y APIs
Salud: MedTech y Salud Digital, Servicios de Salud y Hospitales, Dispositivos Médicos y Biotech
Agro y Alimentos: Agricultura y Ganadería (Agtech), Alimentos y Bebidas, Restaurantes y FoodTech
Bienes Raíces y Construcción: Inmobiliaria y PropTech, Construcción e Infraestructura
Educación y Turismo: EdTech y Educación Online, Instituciones Educativas, Turismo y Hotelería, Entretenimiento y Eventos
Energía y Servicios Públicos: Energía y Renovables, Servicios Públicos (Utilities)
Medios y Telecomunicaciones: Marketing y Publicidad (AdTech), Medios Streaming y Entretenimiento, Telecomunicaciones
Servicios y Sector Público: Servicios Profesionales (Consultoría Legal Contabilidad RR.HH.), GovTech y Sector Público, ONGs y Tercer Sector
```

(Nombres exactos con comas internas se preservan tal cual los compartió el usuario, ej. "Servicios Profesionales (Consultoría, Legal, Contabilidad, RR.HH.)" — la coma dentro del paréntesis no es un separador de lista, es parte del nombre del tag.)

## Comportamiento

1. Un campo de búsqueda (`<input>` de texto) aparece sobre la nube de grupos.
2. Al escribir, cada grupo filtra sus tags por coincidencia parcial insensible a mayúsculas/minúsculas contra el término de búsqueda.
3. Un grupo cuyo filtro no deja ningún tag visible se **oculta completo** (encabezado incluido) — no se muestra un título de sección vacío.
4. Un tag ya seleccionado por el usuario permanece visible y clickeable (para poder deseleccionarlo) **incluso si no coincide** con el término de búsqueda actual — evita que escribir algo "esconda" una selección previa de forma confusa.
5. Con el campo de búsqueda vacío, se muestran todos los 12 grupos con sus tags en orden alfabético dentro de cada uno.
6. El límite de 10 tags activos y el contador `X/10` siguen funcionando exactamente igual que hoy — un tag ya en el límite no permite agregar más hasta deseleccionar alguno.

## Componentes técnicos

**`frontend/app/onboarding/page.tsx`:**
- `TAGS_LIB` (array plano, línea 19-58 actual) se reemplaza por `TAGS_GROUPS: { group: string, tags: string[] }[]` — mismo patrón estructural que el ya existente `INDUSTRY_GROUPS` (línea 59-73), por consistencia con el código ya presente en el archivo.
- Dentro de `Step1`, se agrega un `useState('')` local para el término de búsqueda (`tagSearch`), scoped al componente `Step1` — no al estado global del wizard (`data`), ya que es un filtro de UI transitorio, no un dato del formulario que deba persistirse.
- El render (línea 273-284 actual) se reestructura: un `<input>` de búsqueda arriba, seguido de un `.map()` sobre `TAGS_GROUPS` que para cada grupo calcula sus tags visibles (coincidencia de búsqueda O ya seleccionado), omite el grupo completo si el resultado queda vacío, y renderiza un encabezado de grupo + la nube de esos tags con el mismo patrón de botón pill (`S.pill`/`S.pillOn`) ya usado hoy.

## Validación

Sin test runner en el proyecto — validación manual:
1. `npx tsc --noEmit` en `frontend/` tras el cambio.
2. Prueba visual en navegador contra el entorno de staging: confirmar que los 12 grupos se muestran con sus 40 tags correctos, que escribir en el buscador filtra correctamente (incluyendo el caso de un grupo que desaparece por completo), que un tag seleccionado no desaparece al escribir algo que no lo incluye, y que el límite de 10 sigue bloqueando selecciones adicionales.
