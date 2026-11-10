// Correo de recordatorio para terminar el onboarding. HTML de correo "a prueba de clientes": tablas, estilos en
// línea, sin CSS externo ni gradientes obligatorios (Outlook recibe color sólido vía VML), ancho fijo de 600 px,
// preheader oculto y versión de texto plano.

const C = {
  bg: '#F4F2FF', card: '#FFFFFF', ink: '#1A1730', text: '#3F3D56', muted: '#6E6A8A',
  purple: '#534AB7', green: '#1D9E75', lilac: '#8B7BFF', soft: '#EEEBFF', line: '#E4E0FA',
}
const FONT = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;')

export function firstNameOf(fullName: string | null | undefined): string | null {
  const first = String(fullName || '').trim().split(/\s+/)[0]
  return first ? first.charAt(0).toUpperCase() + first.slice(1) : null
}

export interface OnboardingReminderContent { subject: string; preheader: string; html: string; text: string }

export function buildOnboardingReminderEmail(p: { fullName: string | null; company: string | null; onboardingUrl: string }): OnboardingReminderContent {
  const name = firstNameOf(p.fullName)
  const company = p.company?.trim() || null
  const hi = name ? `¡Hola, ${escapeHtml(name)}!` : '¡Hola!'
  const subject = name ? `${name}, tu primer reporte está a unos minutos 🚀` : 'Tu primer reporte está a unos minutos 🚀'
  const preheader = 'Termina la configuración (≈ 7 minutos) y te enviamos tu primer reporte de inteligencia competitiva.'
  const forCompany = company ? ` de <strong style="color:${C.ink}">${escapeHtml(company)}</strong>` : ''
  const url = escapeHtml(p.onboardingUrl)

  const step = (n: string, title: string, desc: string) => `
              <tr>
                <td width="44" valign="top" style="padding:0 0 16px 0">
                  <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
                    <td width="32" height="32" align="center" valign="middle" bgcolor="${C.soft}" style="width:32px;height:32px;border-radius:16px;background-color:${C.soft};font-family:${FONT};font-size:14px;font-weight:700;color:${C.purple}">${n}</td>
                  </tr></table>
                </td>
                <td valign="top" style="padding:4px 0 16px 0;font-family:${FONT}">
                  <div style="font-size:15px;font-weight:700;color:${C.ink};line-height:1.3">${title}</div>
                  <div style="font-size:13px;color:${C.muted};line-height:1.5;padding-top:2px">${desc}</div>
                </td>
              </tr>`

  const html = `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(subject)}</title>
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<style>
  @media only screen and (max-width:620px){
    .container{width:100% !important}
    .px{padding-left:24px !important;padding-right:24px !important}
    .h1{font-size:24px !important}
    .btn{padding:0 24px !important;font-size:15px !important}
  }
  a{color:${C.purple}}
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all">${preheader}&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${C.bg}" style="background-color:${C.bg}">
  <tr>
    <td align="center" style="padding:32px 12px">
      <!--[if mso]><table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0"><tr><td><![endif]-->
      <table role="presentation" class="container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C.card};border-radius:16px;overflow:hidden;border:1px solid ${C.line}">

        <!-- Encabezado -->
        <tr>
          <td class="px" bgcolor="${C.ink}" style="background-color:${C.ink};padding:28px 40px 30px 40px">
            <img src="https://omnireports.pro/logo-full.png" height="32" alt="Omni Reports" style="display:block;height:32px;width:auto;border:0;outline:none;text-decoration:none;color:#F0F2FF;font-family:${FONT};font-size:20px;font-weight:800">
            <div style="height:22px;line-height:22px;font-size:0">&nbsp;</div>
            <div style="font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:2px;color:${C.lilac};text-transform:uppercase">Te falta muy poco</div>
            <div class="h1" style="font-family:${FONT};font-size:28px;font-weight:800;color:#F0F2FF;line-height:1.2;padding-top:8px">${hi} Tu radar competitivo está casi listo 👋</div>
          </td>
        </tr>
        <!-- Franja de marca -->
        <tr><td height="4" bgcolor="${C.green}" style="height:4px;line-height:4px;font-size:0;background-color:${C.green};background-image:linear-gradient(90deg,${C.purple},${C.green})">&nbsp;</td></tr>

        <!-- Cuerpo -->
        <tr>
          <td class="px" style="padding:32px 40px 8px 40px;font-family:${FONT}">
            <p style="margin:0 0 14px 0;font-size:16px;line-height:1.6;color:${C.text}">
              Hace poco creaste tu cuenta en Omni Reports${forCompany} — ¡gracias por la confianza! Notamos que la configuración quedó a medias, y sin ella todavía no podemos preparar tu primer reporte.
            </p>
            <p style="margin:0 0 24px 0;font-size:16px;line-height:1.6;color:${C.text}">
              Retómala cuando quieras: son unos <strong style="color:${C.ink}">7 minutos</strong> y lo demás lo hacemos nosotros.
            </p>
          </td>
        </tr>

        <!-- Pasos -->
        <tr>
          <td class="px" style="padding:0 40px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#FAF9FF" style="background-color:#FAF9FF;border:1px solid ${C.line};border-radius:12px">
              <tr><td style="padding:22px 22px 6px 22px">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${step('1', 'Cuéntanos de tu empresa', 'Giro, ciudad y cómo te posicionas.')}${step('2', 'Elige a quién vigilar', 'Tus competidores directos e indirectos, y las áreas que te importan.')}${step('3', 'Recibe tu reporte', 'Elige frecuencia y hora; te lo enviamos por correo, listo para decidir.')}
                </table>
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Botón (VML para Outlook, enlace con color sólido + gradiente para el resto) -->
        <tr>
          <td align="center" style="padding:32px 40px 8px 40px">
            <!--[if mso]>
            <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${url}" style="height:52px;v-text-anchor:middle;width:300px" arcsize="50%" stroke="f" fillcolor="${C.purple}">
              <w:anchorlock/>
              <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold">Terminar mi configuración &rarr;</center>
            </v:roundrect>
            <![endif]-->
            <!--[if !mso]><!-->
            <a href="${url}" target="_blank" style="display:inline-block;background-color:${C.purple};background-image:linear-gradient(135deg,${C.purple},${C.green});color:#ffffff;font-family:${FONT};font-size:16px;font-weight:700;line-height:52px;height:52px;padding:0 36px;border-radius:26px;text-decoration:none;white-space:nowrap;mso-hide:all" class="btn">Terminar mi configuración &rarr;</a>
            <!--<![endif]-->
          </td>
        </tr>
        <tr>
          <td class="px" align="center" style="padding:6px 40px 28px 40px;font-family:${FONT};font-size:12px;line-height:1.5;color:${C.muted}">
            Si el botón no abre, copia este enlace en tu navegador:<br>
            <a href="${url}" style="color:${C.purple};word-break:break-all">${url}</a>
          </td>
        </tr>

        <!-- Ayuda -->
        <tr>
          <td class="px" style="padding:0 40px 32px 40px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${C.line}">
              <tr><td style="padding-top:20px;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.text}">
                ¿Te atoraste en algún paso o tienes dudas? Responde a este correo o escríbenos a
                <a href="mailto:soporte@omnireports.pro" style="color:${C.purple};font-weight:600">soporte@omnireports.pro</a> — con gusto te ayudamos. 💜
              </td></tr>
            </table>
          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td bgcolor="${C.bg}" style="background-color:${C.bg};padding:18px 40px;font-family:${FONT};font-size:11px;line-height:1.6;color:${C.muted};text-align:center">
            Omni Reports · AI Automation · <a href="https://omnireports.pro" style="color:${C.lilac};text-decoration:none">omnireports.pro</a><br>
            Recibes este correo porque creaste una cuenta y tu configuración está pendiente. Solo te lo enviaremos una vez.
          </td>
        </tr>
      </table>
      <!--[if mso]></td></tr></table><![endif]-->
    </td>
  </tr>
</table>
</body>
</html>`

  const text = [
    name ? `¡Hola, ${name}!` : '¡Hola!',
    '',
    `Hace poco creaste tu cuenta en Omni Reports${company ? ` de ${company}` : ''}. La configuración quedó a medias y sin ella todavía no podemos preparar tu primer reporte.`,
    'Retómala cuando quieras; son unos 7 minutos:',
    '',
    '1. Cuéntanos de tu empresa',
    '2. Elige a quién vigilar',
    '3. Recibe tu reporte',
    '',
    `Terminar mi configuración: ${p.onboardingUrl}`,
    '',
    '¿Dudas? Responde a este correo o escribe a soporte@omnireports.pro.',
    '',
    'Omni Reports · omnireports.pro',
  ].join('\n')

  return { subject, preheader, html, text }
}
