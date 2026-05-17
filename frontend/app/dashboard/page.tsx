'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const S: Record<string, React.CSSProperties> = {
  card: { background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:14, padding:16, marginBottom:14 },
  lbl:  { fontSize:9, fontWeight:700, letterSpacing:'0.12em', color:'#5A627A', display:'block', marginBottom:6 },
  badge:{ fontSize:9, fontWeight:700, padding:'3px 8px', borderRadius:20 },
  bar:  { height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', marginTop:6 },
  muted:{ color:'#5A627A', fontSize:11 } as React.CSSProperties,
  row:  { display:'flex', alignItems:'center', gap:10, padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.05)' } as React.CSSProperties,
}

const BarFill = ({ pct, color }: { pct: number; color: string }) => (
  <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:3 }} />
)

const GaugeCircle = ({ value, color }: { value: number; color: string }) => {
  const pct = (value / 10) * 100
  const dash = (pct / 100) * 100
  return (
    <svg width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="16" stroke={`${color}25`} strokeWidth="5" fill="none"/>
      <circle cx="20" cy="20" r="16" stroke={color} strokeWidth="5" fill="none"
        strokeDasharray={`${dash} ${100-dash}`} strokeDashoffset="25"
        strokeLinecap="round" transform="rotate(-90 20 20)"/>
      <text x="20" y="24" fill={color} fontSize="9" fontWeight="800" textAnchor="middle" fontFamily="monospace">{value}</text>
    </svg>
  )
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [token, setToken] = useState<string>('')
  const [dashData, setDashData] = useState<any>(null)
  const [selectedReport, setSelectedReport] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [passwordSent, setPasswordSent] = useState(false)
  const [inviteEmails, setInviteEmails] = useState('')
  const [inviteSent, setInviteSent] = useState(false)
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
      setUser(user)
      setToken(session.access_token)
      try {
        const res = await fetch(`${BACKEND}/api/dashboard/${user.id}`, {
          headers: { 'Authorization': 'Bearer ' + session.access_token }
        })
        const data = await res.json()
        setDashData(data)
        // Seleccionar el reporte más reciente con JSON por defecto
        const latest = (data.reports || []).find((r: any) => r.sectionsJson) || (data.reports || []).find((r: any) => r.status === 'COMPLETED')
        if (latest) setSelectedReport(latest)
      } catch(e) { console.error('Dashboard data error:', e) }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleGenerateReport = async () => {
    if (!dashData?.project?.id) return

    // Verificar si hay reporte con status GENERATING
    const reporteEnProceso = (dashData?.reports || []).some((r: any) => r.status === 'GENERATING')
    if (reporteEnProceso) {
      alert('Ya hay un reporte en proceso. Espera ~5 minutos a que termine.')
      return
    }

    // El backend maneja los limites de frecuencia y trial

    setGenerating(true)
    try {
      const res = await fetch(`${BACKEND}/api/reports/generate/${dashData.project.id}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      const data = await res.json()
      if (data.success) {
        window.location.reload()
      } else if (data.error === 'trial_limit') {
        router.push('/checkout')
      } else if (data.error === 'frequency_limit') {
        alert(data.message)
      } else if (data.error) {
        alert(data.message || data.error)
      }
    } catch(e) { console.error('Error generando reporte:', e) }
    setGenerating(false)
  }

  // Auto-refresh cada 30s si hay reporte generándose
  useEffect(() => {
    if (!dashData) return
    const hayGenerando = (dashData?.reports || []).some((r: any) => r.status === 'GENERATING')
    if (!hayGenerando) return
    const interval = setInterval(async () => {
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (!s2) return
        const res = await fetch(`${BACKEND}/api/dashboard/${s2.user.id}`, {
          headers: { 'Authorization': 'Bearer ' + s2.access_token }
        })
        const data = await res.json()
        const sigueGenerando = (data?.reports || []).some((r: any) => r.status === 'GENERATING')
        setDashData(data)
        const latest = (data.reports || []).find((r: any) => r.sectionsJson) || (data.reports || []).find((r: any) => r.status === 'COMPLETED')
        if (latest) setSelectedReport(latest)
        if (!sigueGenerando) clearInterval(interval)
      } catch(e) {}
    }, 30000)
    return () => clearInterval(interval)
  }, [dashData?.reports?.length])

  const handlePasswordReset = async () => {
    if (!user?.email) return
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: 'https://reports-pro.vercel.app/reset-password'
    })
    setPasswordSent(true)
    setTimeout(() => setPasswordSent(false), 5000)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  // Datos del reporte seleccionado o vacíos
  const s = selectedReport?.sectionsJson || {}
  const companyName = dashData?.setup?.companyName || 'Tu Empresa'
  const industry = dashData?.setup?.industry || 'Tu industria'
  const city = dashData?.setup?.city || ''
  const country = dashData?.setup?.country || 'México'
  const frequency = dashData?.project?.frequency || 'WEEKLY'
  const status = dashData?.project?.status || 'TRIAL'

  // Calcular días restantes del trial
  const trialDaysLeft = dashData?.project?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(dashData.project.trialEndsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 5

  // Competidores del setup
  const setupCompetitors = [1,2,3,4,5]
    .filter(i => dashData?.setup?.[`competitor${i}Name`])
    .map(i => dashData.setup[`competitor${i}Name`])

  if (loading) return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(139,123,255,0.3)', borderTopColor:'#8B7BFF', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  // Bloqueo trial vencido: si trialEndsAt ya paso Y no hay stripeSubscriptionId activo
  const tieneStripe = dashData?.subscription?.stripeSubscriptionId != null
  const trialVencido = !tieneStripe &&
    dashData?.project?.trialEndsAt &&
    new Date(dashData.project.trialEndsAt) < new Date()

  if (trialVencido) return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', fontFamily:'system-ui,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
        <div style={{ width:64, height:64, background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.3)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 24px' }}>🔒</div>
        <h1 style={{ fontSize:24, fontWeight:900, marginBottom:12 }}>Tu periodo de prueba ha terminado</h1>
        <p style={{ fontSize:14, color:'#9CA3AF', lineHeight:1.6, marginBottom:28 }}>
          Activa tu plan para seguir recibiendo inteligencia competitiva automatizada.
          Desde <strong style={{ color:'#8B7BFF' }}>$20 USD/mes</strong>. Sin compromisos, cancela cuando quieras.
        </p>
        <button onClick={() => router.push('/checkout')}
          style={{ background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'14px 36px', color:'#0D0F1A', fontSize:14, fontWeight:900, cursor:'pointer', marginBottom:16, width:'100%' }}>
          Ver planes y activar
        </button>
        <button onClick={handleLogout}
          style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'10px 24px', color:'#5A627A', fontSize:12, fontWeight:600, cursor:'pointer', width:'100%' }}>
          Cerrar sesion
        </button>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* NAVBAR */}
      <nav style={{ height:56, borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 28px', background:'#0D0F1A', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:34, height:34, borderRadius:10, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#0D0F1A' }}>PR</div>
          <div>
            <div style={{ fontSize:13, fontWeight:800, color:'#F0F2FF' }}>PRO Reports</div>
            <div style={{ fontSize:10, color:'#5A627A' }}>Inteligencia Competitiva · AI</div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'4px 12px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7A4' }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#6EE7A4' }}>SISTEMA ACTIVO</span>
          </div>
          <span style={{ fontSize:12, color:'#5A627A' }}>{user?.email}</span>
          <button onClick={handleLogout} style={{ fontSize:11, color:'#5A627A', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>Salir →</button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding:'28px 28px 60px' }}>

        {/* ZONA 1 — HEADER con datos reales */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
          <div>
            <span style={S.lbl}>DASHBOARD · INTELIGENCIA COMPETITIVA</span>
            <div style={{ fontSize:26, fontWeight:900, color:'#F0F2FF', lineHeight:1.1 }}>
              <span style={{ color:'#8B7BFF' }}>{companyName}</span>
            </div>
            <div style={{ fontSize:12, color:'#5A627A', marginTop:4 }}>
              {industry}{city ? ` · ${city}, ${country}` : ` · ${country}`} · {new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}
            </div>
            {selectedReport && (
              <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                <span style={{ fontSize:11, color:'#8B7BFF', fontWeight:600 }}>{selectedReport.reportTitle}</span>
                <span style={{ fontSize:10, color:'#5A627A' }}>· {new Date(selectedReport.createdAt).toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})}</span>
                {selectedReport.r2Key && (
                  <a href={`${BACKEND}/api/reports/download/${selectedReport.r2Key?.replace("reports/", "")}`} target="_blank"
                    style={{ fontSize:10, fontWeight:700, color:'#0D0F1A', background:'#8B7BFF', borderRadius:20, padding:'3px 10px', textDecoration:'none' }}>
                    ↓ PDF
                  </a>
                )}
              </div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, fontWeight:700, color:'#5A627A', marginBottom:5 }}>
              {tieneStripe ? 'SUSCRIPCIÓN ACTIVA' : `TRIAL: ${trialDaysLeft} DÍAS RESTANTES`}
            </div>
            {!tieneStripe && (
              <div style={{ width:160 }}>
                <div style={S.bar}><BarFill pct={Math.round(((7-trialDaysLeft)/7)*100)} color="#8B7BFF"/></div>
                <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                  <span style={S.muted}>Día {7-trialDaysLeft}</span>
                  <span style={S.muted}>Día 7</span>
                </div>
              </div>
            )}
            {tieneStripe && (
              <div style={{ fontSize:11, color:'#6EE7A4', marginTop:4, fontWeight:700 }}>✓ Plan {frequency} activo</div>
            )}
          </div>
        </div>

        {/* ZONA 6 — PRÓXIMO REPORTE */}
        <div style={{...S.card, background:'rgba(139,123,255,0.06)', borderColor:'rgba(139,123,255,0.2)'}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div>
              <span style={{...S.lbl, color:'#8B7BFF'}}>PRÓXIMO REPORTE · {dashData?.project?.frequency || 'SEMANAL'}</span>
              <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>Inteligencia Competitiva · {companyName}</div>
              <div style={{...S.muted, marginTop:3}}>{dashData?.project?.deliveryEmail || 'Email'} · {(dashData?.setup?.focusAreas || []).length} áreas activas</div>
              <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {(dashData?.setup?.focusAreas || ['Precios','Campañas','Lanzamientos']).map((a: string) => (
                  <span key={a} style={{...S.badge, background:'rgba(139,123,255,0.15)', color:'#8B7BFF'}}>{a}</span>
                ))}
              </div>
            </div>
            <div style={{ textAlign:'right', flexShrink:0, paddingLeft:20 }}>
              <span style={S.lbl}>GENERACIÓN AUTOMÁTICA</span>
              {(() => {
                const freqDays: Record<string,number> = { DAILY:1, WEEKLY:7, BIWEEKLY:15, MONTHLY:30 }
                const lastReport = (dashData?.reports || []).find((r:any) => r.status === 'COMPLETED')
                const diasFreq = freqDays[frequency] || 7
                if (!lastReport) return <div style={{ fontSize:18, fontWeight:900, color:'#8B7BFF' }}>Pronto</div>
                const diasDesde = Math.floor((Date.now() - new Date(lastReport.createdAt).getTime()) / (1000*60*60*24))
                const diasFaltan = Math.max(0, diasFreq - diasDesde)
                return (
                  <div>
                    <div style={{ fontSize:22, fontWeight:900, color:'#8B7BFF' }}>
                      {diasFaltan === 0 ? 'Hoy' : `${diasFaltan} día${diasFaltan === 1 ? '' : 's'}`}
                    </div>
                    <div style={S.muted}>{diasFaltan === 0 ? 'Listo para generar' : 'para tu próximo reporte'}</div>
                  </div>
                )
              })()}
            </div>
          </div>
        </div>

        {/* ZONA 7 — PANEL USUARIO */}
        <div style={{ background:'linear-gradient(135deg,rgba(139,123,255,0.08),rgba(93,212,212,0.04))', border:'1px solid rgba(139,123,255,0.2)', borderRadius:16, padding:'20px 22px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14, borderBottom:'1px solid rgba(255,255,255,0.06)', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#0D0F1A' }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:'#F0F2FF' }}>{user?.email || 'usuario@email.com'}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                  <span style={{...S.badge, background: tieneStripe ? 'rgba(110,231,164,0.12)' : 'rgba(242,192,99,0.12)', color: tieneStripe ? '#6EE7A4' : '#F2C063'}}>
                    {tieneStripe ? 'Activo' : `Trial · ${trialDaysLeft} días`}
                  </span>
                  <span style={{ fontSize:10, color:'#5A627A' }}>· Plan {frequency}</span>
                  {city && <span style={{ fontSize:10, color:'#5A627A' }}>· {city}, {country}</span>}
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button onClick={()=>{setEditName(dashData?.setup?.companyName||'');setShowEditProfile(true)}} style={{ fontSize:11, fontWeight:600, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'6px 14px', cursor:'pointer' }}>Editar perfil</button>
              <button onClick={handlePasswordReset} style={{ fontSize:11, fontWeight:600, color: passwordSent ? '#6EE7A4' : '#9CA3AF', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'6px 14px', cursor:'pointer' }}>{passwordSent ? '✓ Email enviado' : 'Cambiar contraseña'}</button>
              {tieneStripe && (
                <button onClick={() => router.push('/upgrade')}
                  style={{ fontSize:11, fontWeight:600, color:'#6EE7A4', background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'6px 14px', cursor:'pointer' }}>
                  Gestionar suscripcion
                </button>
              )}
            </div>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'Editar Configuración para Reportes', color:'#8B7BFF', bg:'rgba(139,123,255,0.12)', border:'rgba(139,123,255,0.3)', href:'/onboarding',
                icon:<path d="M12 20h9M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z"/> },
              { label: generating ? 'Generando...' : 'Generar Reporte', color:'#6EE7A4', bg:'rgba(110,231,164,0.08)', border:'rgba(110,231,164,0.2)', href:'#', onClick: handleGenerateReport,
                icon:<><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></> },
              { label:`${(dashData?.reports || []).filter((r: any) => r.status !== 'FAILED').length} Reportes`, color:'#F2C063', bg:'rgba(242,192,99,0.08)', border:'rgba(242,192,99,0.2)', href:'#',
                icon:<path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/> },
              { label:'Invitar Colegas', color:'#9CA3AF', bg:'rgba(255,255,255,0.04)', border:'rgba(255,255,255,0.1)', href:'#', onClick: ()=>setShowInviteModal(true),
                icon:<><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
            ].map((a: any,i: number)=>(
              <a key={i} href={a.href} onClick={a.onClick ? (e)=>{e.preventDefault();a.onClick()} : undefined} style={{ padding:'16px 14px', background:a.bg, border:`1px solid ${a.border}`, borderRadius:14, color:a.color, fontSize:12, fontWeight:700, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:10, textDecoration:'none' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2">{a.icon}</svg>
                {a.label}
              </a>
            ))}
          </div>
        </div>

        {/* ZONA 7.5 — REPORTES GENERADOS */}
        {dashData?.reports?.length > 0 && (
          <div style={{...S.card, marginBottom:14}}>
            <span style={S.lbl}>REPORTES GENERADOS</span>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              {dashData.reports.filter((r: any) => r.status !== 'FAILED').map((r: any, i: number) => (
                <div key={i} onClick={() => r.sectionsJson && setSelectedReport(r)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background: selectedReport?.id === r.id ? 'rgba(139,123,255,0.1)' : 'rgba(255,255,255,0.02)', border:`1px solid ${selectedReport?.id === r.id ? 'rgba(139,123,255,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius:10, cursor: r.sectionsJson ? 'pointer' : 'default' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {!r.reportTitle ? (
                      <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(139,123,255,0.3)', borderTopColor:'#8B7BFF', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={selectedReport?.id === r.id ? '#8B7BFF' : '#5A627A'} strokeWidth="2"><path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>
                    )}
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color: r.reportTitle ? '#F0F2FF' : '#8B7BFF' }}>{r.reportTitle || '⏳ Generando reporte IA... ~5 min'}</div>
                      <div style={{ fontSize:10, color:'#5A627A' }}>{new Date(r.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })} · {r.pdfSizeBytes ? Math.round(r.pdfSizeBytes/1024)+'KB' : 'Procesando...'}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {selectedReport?.id === r.id && <span style={{ fontSize:10, color:'#8B7BFF', fontWeight:700 }}>← Viendo</span>}
                    {r.r2Key && (
                      <a href={`${BACKEND}/api/reports/download/${r.r2Key?.replace("reports/", "")}`} target="_blank"
                        onClick={e => e.stopPropagation()}
                        style={{ fontSize:11, fontWeight:700, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'5px 12px', textDecoration:'none' }}>
                        ↓ PDF
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZONA 8 — MOTORES IA */}
        <div style={{ border:'1px solid rgba(255,255,255,0.07)', borderRadius:16, padding:'18px 20px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#8B7BFF' }}/>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', color:'#5A627A', textTransform:'uppercase' }}>Motores IA — Automation Intelligence PRO Reports</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              { icon:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 010 18"/></>, title:'Inteligencia Competitiva', sub:'Precios, campañas y movimientos', color:'#8B7BFF', active:true },
              { icon:<path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/>, title:'Salud Corporativa RRHH', sub:'Clima laboral y bienestar', color:'#6EE7A4', active:false },
              { icon:<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>, title:'Radar Ciberseguridad', sub:'Vulnerabilidades y alertas', color:'#F2C063', active:false },
              { icon:<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>, title:'Perfil Clave · Personality', sub:'Análisis de personalidad ejecutiva', color:'#5DD4D4', active:false },
            ].map((m,i)=>(
              <div key={i} style={{ padding:'14px 12px', background: m.active ? 'rgba(139,123,255,0.08)' : 'rgba(255,255,255,0.02)', border:`1px solid ${m.active ? 'rgba(139,123,255,0.25)' : 'rgba(255,255,255,0.06)'}`, borderRadius:12, opacity: m.active ? 1 : 0.5 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                  <div style={{ width:30, height:30, borderRadius:8, background: m.active ? `${m.color}20` : 'rgba(255,255,255,0.04)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={m.active ? m.color : '#5A627A'} strokeWidth="2">{m.icon}</svg>
                  </div>
                  <span style={{...S.badge, background: m.active ? 'rgba(110,231,164,0.12)' : 'rgba(255,255,255,0.05)', color: m.active ? '#6EE7A4' : '#5A627A'}}>{m.active ? 'ACTIVO' : 'PRÓXIMO'}</span>
                </div>
                <div style={{ fontSize:11, fontWeight:700, color: m.active ? '#F0F2FF' : '#9CA3AF', marginBottom:3 }}>{m.title}</div>
                <div style={{ fontSize:10, color:'#5A627A' }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ZONA 2 — KPIs con datos reales */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:3, height:16, background:'#8B7BFF', borderRadius:2 }}/>
            <span style={{ fontSize:11, fontWeight:800, color:'#F0F2FF', letterSpacing:'0.05em' }}>RESUMEN DEL REPORTE</span>
            {selectedReport && <span style={{ fontSize:10, color:'#5A627A' }}>· {new Date(selectedReport.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })} {new Date(selectedReport.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}</span>}
          </div>
          {selectedReport?.r2Key && (
            <a href={`${BACKEND}/api/reports/download/${selectedReport.r2Key?.replace("reports/", "")}`} target="_blank"
              style={{ fontSize:11, fontWeight:700, color:'#0D0F1A', background:'#8B7BFF', borderRadius:20, padding:'5px 14px', textDecoration:'none', display:'flex', alignItems:'center', gap:5 }}>
              ↓ PDF
            </a>
          )}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { label:'PRESIÓN COMPETITIVA', value: s.competitivePressure ? `${s.competitivePressure}%` : '—', sub: s.generalTrend || 'Sin datos', color:'#8B7BFF', pct: s.competitivePressure || 0 },
            { label:'ALERTAS CRÍTICAS', value: s.criticalAlertsCount !== undefined ? String(s.criticalAlertsCount) : '—', sub: s.mediumAlertsCount !== undefined ? `${s.mediumAlertsCount} alertas medias` : 'Sin datos', color:'#FF6B6B', pct: s.criticalAlertsCount ? Math.min(s.criticalAlertsCount * 20, 100) : 0 },
            { label:'OPORTUNIDADES', value: s.opportunityScore ? `${s.opportunityScore}%` : '—', sub: s.opportunities ? `${s.opportunities.length} identificadas` : 'Sin datos', color:'#6EE7A4', pct: s.opportunityScore || 0 },
            { label:'RIESGO DE MERCADO', value: s.marketRisk ? `${s.marketRisk}%` : '—', sub: s.riskLevel || 'Sin datos', color:'#F2C063', pct: s.marketRisk || 0 },
          ].map((k,i)=>(
            <div key={i} style={{...S.card, margin:0}}>
              <span style={S.lbl}>{k.label}</span>
              <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{...S.muted, marginTop:4}}>{k.sub}</div>
              <div style={S.bar}><BarFill pct={k.pct} color={k.color}/></div>
            </div>
          ))}
        </div>

        {/* ZONA 3 — Alertas críticas reales */}
        {s.criticalAlerts && s.criticalAlerts.length > 0 && (
          <div style={{...S.card}}>
            <span style={S.lbl}>🔴 ALERTAS CRÍTICAS · ACCIÓN INMEDIATA</span>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {s.criticalAlerts.map((a: any, i: number) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:'rgba(255,107,107,0.05)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:10 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{a.icon || '⚠️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#F0F2FF', marginBottom:2 }}>{a.title}</div>
                    <div style={{ fontSize:11, color:'#9CA3AF' }}>{a.description}</div>
                    {a.action && <div style={{ fontSize:10, color:'#FF6B6B', marginTop:4, fontWeight:600 }}>💡 {a.action}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZONA 4 — Competidores reales del setup + amenaza del reporte */}
        {setupCompetitors.length > 0 && (
          <div style={{...S.card, margin:0, marginBottom:14}}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:'#F0F2FF' }}>Competidores monitoreados</span>
              <span style={{...S.badge, background:'rgba(255,255,255,0.05)', color:'#5A627A'}}>{setupCompetitors.length} activos</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {setupCompetitors.map((name: string, i: number) => {
                const colors = ['#FF6B6B','#F2C063','#8B7BFF','#6EE7A4','#5DD4D4']
                const labels = ['CRÍTICO','VIGILAR','MEDIO','BAJO','BAJO']
                const comp = (s.competitors || []).find((c: any) => c.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
                const threat = comp?.threat || (5 - i)
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.02)', border:`1px solid rgba(255,255,255,0.06)`, borderRadius:10 }}>
                    <GaugeCircle value={threat} color={colors[i % colors.length]}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'#F0F2FF' }}>{name}</div>
                      <div style={S.muted}>{city ? `${city} · ` : ''}{industry}</div>
                      <div style={S.bar}><BarFill pct={threat*10} color={colors[i % colors.length]}/></div>
                    </div>
                    <span style={{...S.badge, background:`${colors[i % colors.length]}20`, color:colors[i % colors.length]}}>{labels[i % labels.length]}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ZONA 5 — Oportunidades reales */}
        {s.opportunities && s.opportunities.length > 0 && (
          <div style={{...S.card, marginBottom:14}}>
            <span style={S.lbl}>🟢 OPORTUNIDADES IDENTIFICADAS</span>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
              {s.opportunities.slice(0,4).map((o: any, i: number) => (
                <div key={i} style={{ padding:'10px 12px', background:'rgba(110,231,164,0.04)', border:'1px solid rgba(110,231,164,0.15)', borderRadius:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:16 }}>{o.icon || '💡'}</span>
                    <div style={{ fontSize:11, fontWeight:700, color:'#F0F2FF' }}>{o.title}</div>
                  </div>
                  <div style={{ fontSize:10, color:'#9CA3AF', lineHeight:1.4 }}>{o.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}



      </div>

    {/* Modal Editar Perfil */}
    {showEditProfile && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
        <div style={{ background:'#1A1730', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:32, width:400, maxWidth:'90vw' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>Editar perfil</div>
            <button onClick={()=>setShowEditProfile(false)} style={{ background:'none', border:'none', color:'#5A627A', cursor:'pointer', fontSize:20 }}>×</button>
          </div>
          <label style={{ fontSize:10, fontWeight:700, color:'#5A627A', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>NOMBRE DE EMPRESA</label>
          <input
            value={editName}
            onChange={e=>setEditName(e.target.value)}
            style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#F0F2FF', fontSize:13, outline:'none', boxSizing:'border-box' as const }}
          />
          <button
            onClick={async()=>{
              await fetch(`${BACKEND}/api/onboarding/save`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({userId:user?.id,companyName:editName})})
              setShowEditProfile(false)
              window.location.reload()
            }}
            style={{ width:'100%', marginTop:16, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
            Guardar cambios →
          </button>
        </div>
      </div>
    )}

    {/* Modal Invitar Colegas */}
    {showInviteModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
        <div style={{ background:'#1A1730', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:32, width:420, maxWidth:'90vw' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>Invitar Colegas</div>
            <button onClick={()=>{setShowInviteModal(false);setInviteSent(false);setInviteEmails('')}} style={{ background:'none', border:'none', color:'#5A627A', cursor:'pointer', fontSize:20 }}>×</button>
          </div>
          {!inviteSent ? (
            <>
              <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:16, lineHeight:1.6 }}>
                Agrega los emails de tus colegas para que también reciban el reporte de inteligencia competitiva.
              </p>
              <label style={{ fontSize:10, fontWeight:700, color:'#5A627A', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>EMAILS (separados por coma)</label>
              <textarea
                value={inviteEmails}
                onChange={e=>setInviteEmails(e.target.value)}
                placeholder="colega1@empresa.com, colega2@empresa.com"
                style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#F0F2FF', fontSize:13, outline:'none', boxSizing:'border-box', resize:'none', height:80, scrollbarWidth:'none' as const }}
              />
              <button
                onClick={()=>setInviteSent(true)}
                style={{ width:'100%', marginTop:16, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                Enviar invitación →
              </button>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#6EE7A4', marginBottom:8 }}>Invitaciones enviadas</div>
              <div style={{ fontSize:13, color:'#9CA3AF' }}>Tus colegas recibirán el próximo reporte automáticamente.</div>
              <button onClick={()=>{setShowInviteModal(false);setInviteSent(false);setInviteEmails('')}} style={{ marginTop:20, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'10px 24px', color:'#F0F2FF', fontSize:13, fontWeight:700, cursor:'pointer' }}>Cerrar</button>
            </div>
          )}
        </div>
      </div>
    )}
    </main>
  )
}
