import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendReportEmail(
  to: string,
  companyName: string,
  reportUrl: string,
  edition: number,
  _unused: number = 0,
  ccEmails: string[] = []
): Promise<void> {

  const subject = `📊 Tu reporte de inteligencia competitiva — ${companyName} · Reporte #${edition}`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #F4F2FF; margin: 0; padding: 20px; }
    .wrap { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(83,74,183,0.12); }
    .header { background: #1A1730; padding: 28px 32px; }
    .logo { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .badge { width: 36px; height: 36px; background: #534AB7; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 900; color: #fff; font-size: 12px; }
    .body { padding: 28px 32px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #534AB7, #1D9E75); color: #fff; text-decoration: none; padding: 14px 28px; border-radius: 20px; font-weight: 700; font-size: 14px; margin: 20px 0; }
    .metric { display: inline-block; background: #F8F7FF; border: 1px solid #EEEDFE; border-radius: 10px; padding: 10px 16px; margin: 4px; text-align: center; }
    .footer { background: #F4F2FF; padding: 16px 32px; text-align: center; font-size: 11px; color: #8B7BFF; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div style="margin-bottom:16px">
        <img src="https://omnireports.pro/logo-full.png" height="32" alt="Omni Reports" style="display:block;height:32px;width:auto">
      </div>
      <div style="font-size:22px;font-weight:900;color:#F0F2FF;line-height:1.2">
        Tu reporte está listo 📈
      </div>
      <div style="font-size:12px;color:#5A627A;margin-top:6px">
        ${companyName} · Reporte #${edition}
      </div>
    </div>

    <div class="body">
      <p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:20px">
        Hola, tu reporte de inteligencia competitiva ya está generado. 
        Incluye análisis de competidores, alertas tempranas, oportunidades detectadas y recomendaciones ejecutables.
      </p>

      <div style="text-align:center;margin-bottom:20px">
        <div class="metric">
          <div style="font-size:9px;font-weight:700;color:#5A627A;letter-spacing:.1em">PÁGINAS</div>
          <div style="font-size:22px;font-weight:900;color:#534AB7">11</div>
        </div>
        <div class="metric">
          <div style="font-size:9px;font-weight:700;color:#5A627A;letter-spacing:.1em">SECCIONES</div>
          <div style="font-size:22px;font-weight:900;color:#1D9E75">11</div>
        </div>
        <div class="metric">
          <div style="font-size:9px;font-weight:700;color:#5A627A;letter-spacing:.1em">FORMATO</div>
          <div style="font-size:22px;font-weight:900;color:#534AB7">PDF</div>
        </div>
      </div>

      <div style="background:#F8F7FF;border:1px solid #EEEDFE;border-radius:12px;padding:16px;margin-bottom:20px">
        <div style="font-size:10px;font-weight:700;color:#8B7BFF;letter-spacing:.1em;margin-bottom:10px">CONTENIDO DEL REPORTE</div>
        <div style="font-size:12px;color:#444;line-height:1.8">
          📈 Executive Summary + Scores<br/>
          🌡️ Termómetro del mercado<br/>
          🏆 Ranking de competidores<br/>
          ⚠️ Early Warning Alerts™<br/>
          📰 Cambios detectados esta semana<br/>
          💰 Inteligencia comercial<br/>
          🎯 Opportunity Score™<br/>
          🛡️ Riesgos estratégicos<br/>
          📈 Benchmark estratégico<br/>
          ✅ Recomendaciones ejecutables<br/>
          📅 Plan próximos 30 días
        </div>
      </div>

      <div style="text-align:center">
        <a href="${reportUrl}" class="btn" style="display:inline-block;background:linear-gradient(135deg,#534AB7,#1D9E75);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:20px;font-weight:700;font-size:14px;margin:20px 0">
          Descargar Reporte PDF →
        </a>
      </div>

      <p style="font-size:12px;color:#888;text-align:center;margin-top:16px">
        Este reporte fue generado automáticamente por Omni Reports · AI Automation.<br/>
        Confidencial — solo para uso interno.
      </p>
    </div>

    <div class="footer">
      Omni Reports · AI Automation · 
      <a href="https://omnireports.pro" style="color:#8B7BFF">omnireports.pro</a>
    </div>
  </div>
</body>
</html>
  `

  await resend.emails.send({
    from: 'Omni Reports <reportes@flow11.mx>',
    to,
    ...(ccEmails.length > 0 && { cc: ccEmails }),
    subject,
    html,
  })

  console.log(`📧 Email enviado a: ${to}`)
}

export async function sendConfirmationEmail(
  to: string,
  fullName: string,
  confirmUrl: string
): Promise<void> {

  const subject = `Confirma tu cuenta — Omni Reports`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #F4F2FF; margin: 0; padding: 20px; }
    .wrap { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(83,74,183,0.12); }
    .header { background: #1A1730; padding: 28px 32px; }
    .body { padding: 28px 32px; }
    .footer { background: #F4F2FF; padding: 16px 32px; text-align: center; font-size: 11px; color: #8B7BFF; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div style="margin-bottom:16px">
        <img src="https://omnireports.pro/logo-full.png" height="32" alt="Omni Reports" style="display:block;height:32px;width:auto">
      </div>
      <div style="font-size:22px;font-weight:900;color:#F0F2FF;line-height:1.2">
        Confirma tu cuenta 👋
      </div>
    </div>

    <div class="body">
      <p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:20px">
        Hola ${fullName}, gracias por registrarte en Omni Reports. Confirma tu correo para activar tu cuenta y empezar a generar tu primer reporte de inteligencia competitiva.
      </p>

      <div style="text-align:center">
        <a href="${confirmUrl}" style="display:inline-block;background:linear-gradient(135deg,#534AB7,#1D9E75);color:#ffffff;text-decoration:none;padding:14px 28px;border-radius:20px;font-weight:700;font-size:14px;margin:20px 0">
          Confirmar mi cuenta →
        </a>
      </div>

      <p style="font-size:12px;color:#888;text-align:center;margin-top:16px">
        Si no creaste esta cuenta, puedes ignorar este correo.
      </p>
    </div>

    <div class="footer">
      Omni Reports · AI Automation ·
      <a href="https://omnireports.pro" style="color:#8B7BFF">omnireports.pro</a>
    </div>
  </div>
</body>
</html>
  `

  await resend.emails.send({
    from: 'Omni Reports <reportes@flow11.mx>',
    to,
    subject,
    html,
  })

  console.log(`📧 Email de confirmación enviado a: ${to}`)
}

export async function sendReportErrorEmail(
  to: string,
  companyName: string
): Promise<void> {

  const subject = `No pudimos generar tu reporte — Omni Reports`

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <style>
    body { font-family: system-ui, sans-serif; background: #F4F2FF; margin: 0; padding: 20px; }
    .wrap { max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(83,74,183,0.12); }
    .header { background: #1A1730; padding: 28px 32px; }
    .body { padding: 28px 32px; }
    .footer { background: #F4F2FF; padding: 16px 32px; text-align: center; font-size: 11px; color: #8B7BFF; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div style="margin-bottom:16px">
        <img src="https://omnireports.pro/logo-full.png" height="32" alt="Omni Reports" style="display:block;height:32px;width:auto">
      </div>
      <div style="font-size:22px;font-weight:900;color:#F0F2FF;line-height:1.2">
        No pudimos generar tu reporte ⚠️
      </div>
      <div style="font-size:12px;color:#5A627A;margin-top:6px">
        ${companyName}
      </div>
    </div>

    <div class="body">
      <p style="font-size:14px;color:#444;line-height:1.6;margin-bottom:20px">
        Tuvimos un problema técnico al generar tu reporte de inteligencia competitiva. Nuestro equipo ya fue notificado automáticamente y lo está revisando — no necesitas hacer nada por ahora.
      </p>
      <p style="font-size:14px;color:#444;line-height:1.6">
        Si tienes dudas, puedes responder directamente a este correo.
      </p>
    </div>

    <div class="footer">
      Omni Reports · AI Automation ·
      <a href="https://omnireports.pro" style="color:#8B7BFF">omnireports.pro</a>
    </div>
  </div>
</body>
</html>
  `

  try {
    await resend.emails.send({
      from: 'Omni Reports <reportes@flow11.mx>',
      to,
      subject,
      html,
    })
    console.log(`📧 Email de error de reporte enviado a: ${to}`)
  } catch (e) {
    console.error('Error enviando sendReportErrorEmail:', e)
  }
}

export async function sendContactFormEmail(
  name: string,
  email: string,
  message: string
): Promise<void> {

  const subject = `📩 Nuevo mensaje de contacto — ${name}`

  const escapedMessage = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>')

  const html = `
<div style="font-family:system-ui,sans-serif;font-size:14px;color:#222;line-height:1.6">
  <p><strong>Nombre:</strong> ${name}</p>
  <p><strong>Email:</strong> ${email}</p>
  <p><strong>Mensaje:</strong></p>
  <p>${escapedMessage}</p>
  <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
</div>
  `

  await resend.emails.send({
    from: 'Omni Reports <reportes@flow11.mx>',
    to: 'info@omnireports.pro',
    replyTo: email,
    subject,
    html,
  })

  console.log(`📧 Mensaje de contacto enviado a info@omnireports.pro de ${email}`)
}

export async function sendSupportEmail(
  userName: string,
  userEmail: string,
  message: string,
  chatContext: { role: 'user' | 'assistant'; content: string }[] = []
): Promise<void> {

  const subject = `🆘 Soporte — ${userName}`

  const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const contextHtml = chatContext.length > 0
    ? `
      <p><strong>Conversación previa con el Agente IA:</strong></p>
      <div style="background:#F8F7FF;border:1px solid #EEEDFE;border-radius:8px;padding:12px;margin-bottom:16px">
        ${chatContext.map(m => `<p style="margin:4px 0"><strong>${m.role === 'user' ? escapeHtml(userName) : 'Agente IA'}:</strong> ${escapeHtml(m.content)}</p>`).join('')}
      </div>
    `
    : ''

  const html = `
<div style="font-family:system-ui,sans-serif;font-size:14px;color:#222;line-height:1.6">
  <p><strong>Usuario:</strong> ${escapeHtml(userName)}</p>
  <p><strong>Email:</strong> ${escapeHtml(userEmail)}</p>
  ${contextHtml}
  <p><strong>Mensaje:</strong></p>
  <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>
  <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
</div>
  `

  await resend.emails.send({
    from: 'Omni Reports <reportes@flow11.mx>',
    to: 'soporte@omnireports.pro',
    replyTo: userEmail,
    subject,
    html,
  })

  console.log(`📧 Mensaje de soporte enviado a soporte@omnireports.pro de ${userEmail}`)
}

export async function sendReportErrorAdminAlert(
  companyName: string,
  projectId: string,
  errorMessage: string
): Promise<void> {

  const subject = `🚨 Fallo generación de reporte — ${companyName}`

  const html = `
<div style="font-family:system-ui,sans-serif;font-size:14px;color:#222;line-height:1.6">
  <p><strong>Proyecto:</strong> ${companyName}</p>
  <p><strong>Project ID:</strong> ${projectId}</p>
  <p><strong>Error:</strong> ${errorMessage}</p>
  <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
</div>
  `

  try {
    await resend.emails.send({
      from: 'Omni Reports <reportes@flow11.mx>',
      to: 'admin@omnireports.pro',
      subject,
      html,
    })
    console.log(`📧 Alerta de error de reporte enviada a admin@omnireports.pro`)
  } catch (e) {
    console.error('Error enviando sendReportErrorAdminAlert:', e)
  }
}