import twilio from 'twilio'
import https from 'https'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

async function shortenUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const encoded = encodeURIComponent(url)
    https.get(`https://tinyurl.com/api-create.php?url=${encoded}`, (res) => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data.trim() || url))
    }).on('error', () => resolve(url))
  })
}

export async function sendReportWhatsApp(
  phone: string,
  companyName: string,
  reportUrl: string,
  reportNumber: number
): Promise<void> {
  // Formato internacional — agregar +52 si no tiene código de país
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '')
  const toPhone = cleanPhone.startsWith('+') ? cleanPhone : '+52' + cleanPhone
  const to = 'whatsapp:' + toPhone

  // Acortar URL para WhatsApp
  const shortUrl = await shortenUrl(reportUrl)

  const mensaje = `🚀 *Reports PRO — Reporte #${reportNumber}*

Hola, tu reporte de *Inteligencia Competitiva* para *${companyName}* está listo.

📊 Incluye:
- Movimientos de competidores
- Alertas del sector
- Tendencias y oportunidades
- Recomendaciones ejecutivas

📥 *Descarga tu reporte aquí:*
${shortUrl}

_Este reporte fue generado automáticamente por Reports PRO AI._`

  await client.messages.create({
    from: FROM,
    to,
    body: mensaje,
  })

  console.log(`[WhatsApp] Mensaje enviado a ${toPhone}`)
}
