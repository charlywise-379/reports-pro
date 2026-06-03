import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'
const TEMPLATE_SID = 'HX577fa9c7c055dcc7b4cc2bc8973bab97'

async function shortenUrl(url: string): Promise<string> {
  return new Promise((resolve) => {
    const https = require('https')
    const encoded = encodeURIComponent(url)
    https.get(`https://tinyurl.com/api-create.php?url=${encoded}`, (res: any) => {
      let data = ''
      res.on('data', (chunk: any) => data += chunk)
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
  const cleanPhone = phone.replace(/\s+/g, '').replace(/[^+\d]/g, '')
  const toPhone = cleanPhone.startsWith('+') ? cleanPhone : '+52' + cleanPhone
  const to = 'whatsapp:' + toPhone

  const shortUrl = await shortenUrl(reportUrl)

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

  console.log(`[WhatsApp] Reporte enviado a ${toPhone} via template`)
}
