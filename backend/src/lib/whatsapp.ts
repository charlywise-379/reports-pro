import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

const FROM = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'

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

  const mensaje = `🚀 *Reports PRO — Reporte #${reportNumber}*

Hola, tu reporte de *Inteligencia Competitiva* para *${companyName}* está listo.

📊 Incluye:
- Movimientos de competidores
- Alertas del sector
- Tendencias y oportunidades
- Recomendaciones ejecutivas

📥 *Descarga tu reporte aquí:*
${reportUrl}

_Este reporte fue generado automáticamente por Reports PRO AI._`

  await client.messages.create({
    from: FROM,
    to,
    body: mensaje,
  })

  console.log(`[WhatsApp] Mensaje enviado a ${toPhone}`)
}
