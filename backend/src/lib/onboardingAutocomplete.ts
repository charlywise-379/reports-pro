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
    return `Busca en la web información pública real de esta empresa antes de responder — usa la herramienta de búsqueda web, no respondas de memoria.
Nombre: ${nombre}
Sitio web: ${sitioWeb}

Encuentra sus perfiles de redes sociales oficiales (Instagram, Facebook, X/Twitter, LinkedIn, TikTok) y describe brevemente su industria/giro y una frase de pitch.

Después de buscar, responde con un bloque JSON (puede ir precedido de texto o markdown, será extraído) con esta forma exacta (usa "" para cualquier campo que no encuentres, nunca inventes datos):
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
  return `Busca en la web información pública real de esta empresa competidora antes de responder — usa la herramienta de búsqueda web, no respondas de memoria.
Nombre: ${nombre}
Sitio web: ${sitioWeb}

Encuentra sus perfiles de redes sociales oficiales (Instagram, Facebook, X/Twitter, LinkedIn, TikTok), sus productos/servicios principales, y estima su nivel de amenaza competitiva (1-10) basándote en su tamaño y presencia digital aparente.

Después de buscar, responde con un bloque JSON (puede ir precedido de texto o markdown, será extraído) con esta forma exacta (usa "" para cualquier campo de texto que no encuentres, nunca inventes datos):
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

  try {
    return JSON.parse(candidate) as AutocompleteResult
  } catch (e) {
    console.error('❌ Error parseando JSON de autocompletado:', candidate.slice(0, 500))
    throw new Error('La IA devolvió una respuesta con formato inválido')
  }
}
