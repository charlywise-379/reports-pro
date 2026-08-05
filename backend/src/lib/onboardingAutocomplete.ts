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
  ciudad?: string
  mercadoObjetivo?: string
  productos?: string
  amenazaEstimada?: number
  razonNoEncontrado?: string
}

const TIMEOUT_MS = 45000
const SITE_FETCH_TIMEOUT_MS = 8000
const SITE_HTML_MAX_CHARS = 15000

// ─── Fetch directo del sitio como respaldo ───────────
// web_search no siempre indexa dominios nuevos o de bajo tráfico (confirmado
// en pruebas: un sitio real y activo puede devolver cero resultados en
// site:dominio.com). Como el usuario ya nos da la URL exacta, la visitamos
// directamente en paralelo a la búsqueda — así Claude tiene el HTML real del
// sitio (con sus links de redes sociales en header/footer) aunque el motor
// de búsqueda no lo haya rastreado.
// Bloquea SSRF hacia redes privadas/loopback/link-local — el usuario controla
// el valor de sitioWeb (campo de formulario), y este fetch corre desde el
// backend, así que no debe poder alcanzar infraestructura interna.
export function isPrivateOrLoopbackHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h.endsWith('.local')) return true
  // IPv4 literal — bloquea loopback, privadas RFC1918, link-local (incl. metadata 169.254.x.x)
  const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])]
    if (a === 127 || a === 10 || a === 0) return true
    if (a === 169 && b === 254) return true
    if (a === 172 && b >= 16 && b <= 31) return true
    if (a === 192 && b === 168) return true
    return false
  }
  if (h === '::1' || h.startsWith('fe80:') || h.startsWith('fc') || h.startsWith('fd')) return true
  return false
}

async function fetchSiteContext(sitioWeb: string): Promise<string | null> {
  const url = /^https?:\/\//i.test(sitioWeb) ? sitioWeb : `https://${sitioWeb}`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return null
  if (isPrivateOrLoopbackHost(parsed.hostname)) return null

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SITE_FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OmniReportsBot/1.0)' },
    })
    if (!res.ok) return null
    const html = await res.text()

    // Extrae links a redes sociales conocidas del HTML crudo — no requiere
    // parseo completo de DOM, solo captura hrefs que apunten a esos dominios.
    const socialLinks = new Set<string>()
    const linkRegex = /href=["']([^"']*(?:instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|tiktok\.com)[^"']*)["']/gi
    let match: RegExpExecArray | null
    while ((match = linkRegex.exec(html)) !== null) {
      socialLinks.add(match[1])
    }

    // Texto visible aproximado (sin scripts/estilos) para dar contexto de industria/pitch,
    // recortado a un tamaño razonable para no inflar el prompt.
    const textOnly = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, SITE_HTML_MAX_CHARS)

    const linksBlock = socialLinks.size > 0
      ? `Links a redes sociales encontrados en el HTML del sitio:\n${[...socialLinks].map(l => `- ${l}`).join('\n')}`
      : 'No se encontraron links a redes sociales en el HTML del sitio.'

    return `${linksBlock}\n\nTexto visible extraído de la página (para contexto de industria/pitch):\n${textOnly}`
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

const DIRECTIVAS_FIDELIDAD = `REGLAS DE FIDELIDAD — sigue todas estrictamente:
1. Nunca asumas datos basándote en el nombre de la empresa (ej. no asumas industria o productos solo porque el nombre lo sugiere) — solo reporta lo que la búsqueda o el contenido del sitio confirmen.
2. Cada campo que reportes debe originarse en un resultado de búsqueda real o en el contenido del sitio que se te proporcionó — nunca en tu conocimiento general o en suposiciones.
3. Si el resultado más cercano que encuentras NO coincide exactamente con el nombre o dominio dado (ej. un dominio parecido pero distinto, una empresa con nombre similar pero de otro giro/ciudad), ignóralo por completo — no lo reportes ni como aproximación.
4. Antes de aceptar un perfil de red social como válido, confirma que el nombre de usuario o el contenido de la página coincide razonablemente con la empresa dada — no un parecido superficial de palabras.
5. Si tras intentar varias estrategias de búsqueda y revisar el contenido del sitio genuinamente no encuentras algo, deja ese campo vacío — es preferible un campo vacío a un dato incorrecto.
6. No inventes ni completes campos "por completar el JSON" — cada valor no vacío debe ser verificable.`

function buildPrompt(nombre: string, sitioWeb: string, tipo: 'company' | 'competitor', siteContext: string | null): string {
  const dominio = sitioWeb.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/.*$/, '')

  const estrategiaBusqueda = `ESTRATEGIA DE BÚSQUEDA — sigue este orden, no busques solo el nombre como texto libre:
1. Ya se obtuvo el contenido del sitio ${sitioWeb} (ver bloque "CONTENIDO DEL SITIO WEB" abajo) — revísalo primero, ahí puede haber links directos a redes sociales.
2. Busca "site:${dominio}" para encontrar páginas indexadas de ese dominio exacto.
3. Busca "${nombre} site:instagram.com", "${nombre} site:facebook.com", "${nombre} site:linkedin.com", "${nombre} site:tiktok.com" (una consulta por red) para encontrar los perfiles reales, no genéricos.
4. Solo si lo anterior no da resultados, intenta una búsqueda más amplia con "${nombre}" combinado con una palabra de contexto (ej. la industria o ubicación si la conoces).
Si después de intentar estas estrategias genuinamente no encuentras nada, es válido dejar el campo vacío — pero no te rindas tras una sola búsqueda genérica del nombre.`

  const siteContextBlock = siteContext
    ? `\nCONTENIDO DEL SITIO WEB (obtenido directamente de ${sitioWeb}):\n${siteContext}\n`
    : `\nNota: no fue posible obtener el contenido de ${sitioWeb} directamente (sitio caído, bloqueó el acceso, o URL inválida) — depende únicamente de la búsqueda web.\n`

  if (tipo === 'company') {
    return `Busca en la web información pública real de esta empresa antes de responder — usa la herramienta de búsqueda web, no respondas de memoria.
Nombre: ${nombre}
Sitio web: ${sitioWeb}
${siteContextBlock}
${estrategiaBusqueda}

${DIRECTIVAS_FIDELIDAD}

Encuentra sus perfiles de redes sociales oficiales (Instagram, Facebook, X/Twitter, LinkedIn, TikTok), describe brevemente su industria/giro y una frase de pitch, y si es posible determina la ciudad donde opera principalmente y su mercado objetivo (a quién le vende — ej. "PYMES en México", "consumidores finales en CDMX", "empresas B2B en LATAM").

Si después de aplicar la estrategia de búsqueda genuinamente no encontraste ningún dato verificable (ningún campo con información real), incluye el campo "razonNoEncontrado" con una explicación breve en español (una frase) del motivo probable — por ejemplo "El sitio no respondió a la solicitud", "No se encontraron perfiles públicos verificables con ese nombre", "El dominio no está indexado en buscadores". Si sí encontraste al menos un dato, omite este campo o déjalo vacío.

Después de buscar, responde con un bloque JSON (puede ir precedido de texto o markdown, será extraído) con esta forma exacta (usa "" para cualquier campo que no encuentres, nunca inventes datos). Para las redes sociales acepta cualquier formato útil que encuentres — @usuario, nombre de página, o la URL completa del perfil, lo que tengas disponible:
{
  "instagram": "<@usuario, nombre, o URL del perfil, o vacío>",
  "facebook": "<@usuario, nombre, o URL del perfil, o vacío>",
  "twitter": "<@usuario, nombre, o URL del perfil, o vacío>",
  "linkedin": "<@usuario, nombre, o URL del perfil, o vacío>",
  "tiktok": "<@usuario, nombre, o URL del perfil, o vacío>",
  "industria": "<industria/giro detectado o vacío>",
  "pitch": "<una frase breve describiendo a qué se dedica, máximo 160 caracteres, o vacío>",
  "ciudad": "<ciudad principal de operación detectada, o vacío>",
  "mercadoObjetivo": "<a quién le vende, en pocas palabras, o vacío>",
  "razonNoEncontrado": "<explicación breve si no se encontró nada, o vacío>"
}`
  }
  return `Busca en la web información pública real de esta empresa competidora antes de responder — usa la herramienta de búsqueda web, no respondas de memoria.
Nombre: ${nombre}
Sitio web: ${sitioWeb}
${siteContextBlock}
${estrategiaBusqueda}

${DIRECTIVAS_FIDELIDAD}

Encuentra sus perfiles de redes sociales oficiales (Instagram, Facebook, X/Twitter, LinkedIn, TikTok), sus productos/servicios principales, y estima su nivel de amenaza competitiva (1-10) basándote en su tamaño y presencia digital aparente.

Si después de aplicar la estrategia de búsqueda genuinamente no encontraste ningún dato verificable (ningún campo con información real), incluye el campo "razonNoEncontrado" con una explicación breve en español (una frase) del motivo probable — por ejemplo "El sitio no respondió a la solicitud", "No se encontraron perfiles públicos verificables con ese nombre", "El dominio no está indexado en buscadores". Si sí encontraste al menos un dato, omite este campo o déjalo vacío.

Después de buscar, responde con un bloque JSON (puede ir precedido de texto o markdown, será extraído) con esta forma exacta (usa "" para cualquier campo de texto que no encuentres, nunca inventes datos). Para las redes sociales acepta cualquier formato útil que encuentres — @usuario, nombre de página, o la URL completa del perfil, lo que tengas disponible:
{
  "instagram": "<@usuario, nombre, o URL del perfil, o vacío>",
  "facebook": "<@usuario, nombre, o URL del perfil, o vacío>",
  "twitter": "<@usuario, nombre, o URL del perfil, o vacío>",
  "linkedin": "<@usuario, nombre, o URL del perfil, o vacío>",
  "tiktok": "<@usuario, nombre, o URL del perfil, o vacío>",
  "productos": "<productos o servicios principales detectados, o vacío>",
  "amenazaEstimada": <número del 1 al 10>,
  "razonNoEncontrado": "<explicación breve si no se encontró nada, o vacío>"
}`
}

export async function autocompleteCompanyInfo(
  nombre: string,
  sitioWeb: string,
  tipo: 'company' | 'competitor'
): Promise<AutocompleteResult> {
  const siteContext = await fetchSiteContext(sitioWeb)
  const prompt = buildPrompt(nombre, sitioWeb, tipo, siteContext)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  let jsonText = ''
  try {
    const stream = await anthropic.messages.stream({
      model: 'claude-sonnet-4-5',
      max_tokens: 2048,
      tools: [
        {
          type: 'web_search_20250305' as any,
          name: 'web_search',
        },
      ],
      messages: [
        { role: 'user', content: prompt },
      ],
    }, { signal: controller.signal })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && (event.delta as any)?.type === 'text_delta') {
        jsonText += (event.delta as any).text
      }
    }
  } catch (err: any) {
    if (err instanceof Anthropic.APIUserAbortError) {
      throw new Error('Tiempo de espera agotado buscando información')
    }
    throw new Error(`Error consultando IA: ${err.message}`)
  } finally {
    clearTimeout(timeoutId)
  }

  if (!jsonText) {
    throw new Error('La IA no devolvió resultados')
  }

  // Claude puede anteponer texto/markdown antes del JSON (ya no usamos prefill
  // de assistant porque bloqueaba el uso real de web_search) — extraemos el
  // primer objeto JSON balanceado del texto en vez de asumir que empieza en '{'.
  const firstBrace = jsonText.indexOf('{')
  const lastBrace = jsonText.lastIndexOf('}')
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) {
    console.error('❌ No se encontró JSON en la respuesta de autocompletado:', jsonText.slice(0, 500))
    throw new Error('La IA devolvió una respuesta con formato inválido')
  }
  const candidate = jsonText.slice(firstBrace, lastBrace + 1)

  let parsed: AutocompleteResult
  try {
    parsed = JSON.parse(candidate) as AutocompleteResult
  } catch (e) {
    console.error('❌ Error parseando JSON de autocompletado:', candidate.slice(0, 500))
    throw new Error('La IA devolvió una respuesta con formato inválido')
  }

  // Claude puede devolver un número fuera de rango o no numérico pese a la
  // instrucción del prompt — se acota aquí, en el origen del dato, en vez de
  // confiar en que cada consumidor (frontend, futuras integraciones) lo valide.
  if (parsed.amenazaEstimada !== undefined) {
    const n = Number(parsed.amenazaEstimada)
    parsed.amenazaEstimada = Number.isFinite(n) ? Math.min(10, Math.max(1, Math.round(n))) : undefined
  }

  return parsed
}
