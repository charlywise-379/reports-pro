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
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
        <div style="width:36px;height:36px;background:#534AB7;border-radius:8px;display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:12px">OM</div>
        <div>
          <div style="font-size:13px;font-weight:800;color:#F0F2FF">Omni Reports · AI Automation</div>
          <div style="font-size:9px;color:#8B7BFF;letter-spacing:.1em">INTELIGENCIA COMPETITIVA</div>
        </div>
      </div>
      <div style="font-size:22px;font-weight:900;color:#F0F2FF;line-height:1.2">
        Tu reporte está listo 📊
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
          📊 Executive Summary + Scores<br/>
          🌡️ Termómetro del mercado<br/>
          🏆 Ranking de competidores<br/>
          ⚠️ Early Warning Alerts™<br/>
          📰 Cambios detectados esta semana<br/>
          💰 Inteligencia comercial<br/>
          🎯 Opportunity Score™<br/>
          🛡️ Riesgos estratégicos<br/>
          📊 Benchmark estratégico<br/>
          ✅ Recomendaciones ejecutables<br/>
          📅 Plan próximos 30 días
        </div>
      </div>

      <div style="text-align:center">
        <a href="${reportUrl}" class="btn">
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