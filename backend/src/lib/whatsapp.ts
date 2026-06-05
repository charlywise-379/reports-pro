import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
const TEMPLATE_SID = 'HX577fa9c7c055dcc7b4cc2bc8973bab97'
const SHORT_DOMAIN = 'https://r.flow11.mx'

async function createShortLink(url: string): Promise<string> {
  const apiToken = process.env.CF_API_TOKEN || ''
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || ''
  const namespaceId = process.env.CF_KV_NAMESPACE_ID || ''
  console.log('[ShortLink] CF_API_TOKEN presente:', apiToken ? 'SI (' + apiToken.substring(0,8) + '...)' : 'NO — variable vacía')
  console.log('[ShortLink] accountId:', accountId ? accountId.substring(0,8) + '...' : 'VACÍO')
  console.log('[ShortLink] namespaceId:', namespaceId ? namespaceId.substring(0,8) + '...' : 'VACÍO')
  try {
    const code = Math.random().toString(36).substring(2, 8)
    const kvUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/storage/kv/namespaces/${namespaceId}/values/${code}`
    const res = await fetch(kvUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'text/plain',
      },
      body: url,
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error('KV write failed: ' + err)
    }
    console.log('[ShortLink] Creado: ' + SHORT_DOMAIN + '/' + code)
    return SHORT_DOMAIN + '/' + code
  } catch (e) {
    console.error('[ShortLink] Error — usando URL original:', e)
    return url
  }
}

export async function sendReportWhatsApp(
  phone: string,
  companyName: string,
  reportUrl: string,
  reportNumber: number
): Promise<void> {
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '')
  const toPhone = cleanPhone.startsWith('+') ? cleanPhone : '+52' + cleanPhone
  const to = 'whatsapp:' + toPhone

  const shortUrl = await createShortLink(reportUrl)

  await client.messages.create({
    from: FROM,
    to,
    contentSid: TEMPLATE_SID,
    contentVariables: JSON.stringify({
      "1": String(reportNumber),
      "2": companyName,
      "3": shortUrl,
    }),
  })

  console.log('[WhatsApp] Reporte enviado a ' + toPhone + ' via template')
}
