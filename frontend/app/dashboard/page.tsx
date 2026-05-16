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
      const accessToken = session.access_token
      setUser(session.user)
      setToken(accessToken)
      try {
        const res = await fetch(`${BACKEND}/api/dashboard/${session.user.id}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        })
        const data = await res.json()
        setDashData(data)
        const latest = (data.reports || []).find((r: any) => r.sectionsJson)
        if (latest) setSelectedReport(latest)
      } catch(e) { console.error('Dashboard data error:', e) }
      setLoading(false)
    }
    getUser()
  }, [])

  const handleGenerateReport = async () => {
    if (!dashData?.project?.id) return
    const reporteEnProceso = (dashData?.reports || []).some((r: any) => !r.reportTitle)
    if (reporteEnProceso) { alert('Ya hay un reporte en proceso. Espera ~5 minutos.'); return }
    const ultimoReporte = dashData?.reports?.[0]
    if (ultimoReporte) {
      const minutos = (Date.now() - new Date(ultimoReporte.createdAt).getTime()) / 60000
      if (minutos < 10) { alert('Espera ' + Math.round(10 - minutos) + ' min antes de generar otro.'); return }
    }
    setGenerating(true)
    try {
      const res = await fetch(`${BACKEND}/api/reports/generate/${dashData.project.id}`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success) window.location.reload()
    } catch(e) { console.error(e) }
    setGenerating(false)
  }

  useEffect(() => {
    if (!dashData) return
    const hayGenerando = (dashData?.reports || []).some((r: any) => !r.reportTitle && r.status !== 'FAILED')
    if (!hayGenerando) return
    const interval = setInterval(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        const res = await fetch(`${BACKEND}/api/dashboard/${session.user.id}`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
        const data = await res.json()
        const sigueGenerando = (data?.reports || []).some((r: any) => !r.reportTitle && r.status !== 'FAILED')
        setDashData(data)
        const latest = (data.reports || []).find((r: any) => r.sectionsJson)
        if (latest) setSelectedReport(latest)
        if (!sigueGenerando) clearInterval(interval)
      } catch(e) {}
    }, 30000)
    return () => clearInterval(interval)
  }, [dashData?.reports?.length])

  const handlePasswordReset = async () => {
    if (!user?.email) return
    await supabase.auth.resetPasswordForEmail(user.email, { redirectTo: 'https://reports-pro.vercel.app/reset-password' })
    setPasswordSent(true)
    setTimeout(() => setPasswordSent(false), 5000)
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }

  const s = selectedReport?.sectionsJson || {}
  const companyName = dashData?.setup?.companyName || 'Tu Empresa'
  const industry = dashData?.setup?.industry || 'Tu industria'
  const city = dashData?.setup?.city || ''
  const country = dashData?.setup?.country || 'Mexico'
  const status = dashData?.project?.status || 'TRIAL'
  const trialDaysLeft = dashData?.project?.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(dashData.project.trialEndsAt).getTime() - Date.now()) / (1000*60*60*24))) : 5
  const setupCompetitors = [1,2,3,4,5]
    .filter(i => dashData?.setup?.[`competitor${i}Name`])
    .map(i => dashData.setup[`competitor${i}Name`])

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#0D0F1A' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(139,123,255,0.2)', borderTop:'3px solid #8B7BFF', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const reports = (dashData?.reports || []).filter((r: any) => r.status !== 'FAILED')
  const hayGenerando = reports.some((r: any) => !r.reportTitle && r.status !== 'FAILED')

  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', fontFamily:'system-ui, sans-serif', padding:'24px 20px', paddingBottom:60 }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* HEADER */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
            <div style={{ width:32, height:32, background:'#534AB7', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#fff' }}>PR</div>
            <span style={{ fontSize:11, fontWeight:700, color:'#8B7BFF', letterSpacing:'0.1em' }}>PRO REPORTS</span>
          </div>
          <h1 style={{ fontSize:22, fontWeight:900, margin:0, letterSpacing:'-0.02em' }}>{companyName}</h1>
          <div style={{ fontSize:11, color:'#5A627A', marginTop:2 }}>{industry}{city ? ' · ' + city : ''} · {country}</div>
        </div>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={()=>router.push('/onboarding')} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'8px 16px', color:'#9CA3AF', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Editar perfil
          </button>
          <button onClick={handleGenerateReport} disabled={generating || hayGenerando}
            style={{ background: generating||hayGenerando ? 'rgba(139,123,255,0.2)' : 'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'8px 18px', color: generating||hayGenerando ? '#8B7BFF' : '#0D0F1A', fontSize:12, fontWeight:800, cursor: generating||hayGenerando ? 'default':'pointer' }}>
            {hayGenerando ? 'Generando...' : generating ? 'Iniciando...' : `Generar Reporte (${reports.filter((r:any)=>r.reportTitle).length})`}
          </button>
          <button onClick={handleLogout} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'8px 16px', color:'#5A627A', fontSize:12, fontWeight:600, cursor:'pointer' }}>
            Salir
          </button>
        </div>
      </div>

      {/* TRIAL BANNER */}
      {status === 'TRIAL' && (
        <div style={{ background:'rgba(242,192,99,0.08)', border:'1px solid rgba(242,192,99,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
          <div style={{ fontSize:12, color:'#F2C063', fontWeight:600 }}>Trial activo — {trialDaysLeft} dias restantes</div>
          <button onClick={()=>router.push('/checkout')} style={{ background:'#F2C063', border:'none', borderRadius:20, padding:'6px 16px', color:'#0D0F1A', fontSize:11, fontWeight:800, cursor:'pointer' }}>
            Activar plan →
          </button>
        </div>
      )}

      {/* INDICADOR GENERANDO */}
      {hayGenerando && (
        <div style={{ background:'rgba(139,123,255,0.08)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:12, padding:'12px 16px', marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:16, height:16, border:'2px solid rgba(139,123,255,0.3)', borderTop:'2px solid #8B7BFF', borderRadius:'50%', animation:'spin 1s linear infinite', flexShrink:0 }}/>
          <span style={{ fontSize:12, color:'#8B7BFF', fontWeight:600 }}>Generando reporte IA... ~5 min. Se actualiza automaticamente.</span>
        </div>
      )}

      {/* SELECTOR REPORTES */}
      {reports.filter((r:any)=>r.reportTitle).length > 1 && (
        <div style={{ display:'flex', gap:8, marginBottom:20, overflowX:'auto', paddingBottom:4 }}>
          {reports.filter((r: any) => r.reportTitle).map((r: any) => (
            <button key={r.id} onClick={()=>setSelectedReport(r)}
              style={{ flexShrink:0, background: selectedReport?.id===r.id ? 'rgba(139,123,255,0.15)':'rgba(255,255,255,0.03)', border: selectedReport?.id===r.id ? '1px solid rgba(139,123,255,0.4)':'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'6px 14px', color: selectedReport?.id===r.id ? '#8B7BFF':'#5A627A', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}>
              {selectedReport?.id===r.id ? 'Viendo · ':''}{new Date(r.createdAt).toLocaleDateString('es-MX',{day:'numeric',month:'short'})}
            </button>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px, 1fr))', gap:10, marginBottom:16 }}>
        {[
          { label:'SCORE COMPETITIVO', value: s.competitiveScore ? s.competitiveScore+'/10':'--', sub: s.marketPosition||'Sin datos', color:'#8B7BFF', pct: s.competitiveScore ? s.competitiveScore*10:0 },
          { label:'OPORTUNIDADES', value: s.opportunities?.length||'--', sub:'Detectadas este periodo', color:'#6EE7A4', pct: s.opportunities?.length ? Math.min(s.opportunities.length*20,100):0 },
          { label:'ALERTAS CRITICAS', value: s.criticalAlerts?.length||'--', sub:'Requieren atencion', color:'#FF6B6B', pct: s.criticalAlerts?.length ? Math.min(s.criticalAlerts.length*25,100):0 },
          { label:'RIESGO DE MERCADO', value: s.marketRisk ? s.marketRisk+'%':'--', sub: s.riskLevel||'Sin datos', color:'#F2C063', pct: s.marketRisk||0 },
        ].map((k,i)=>(
          <div key={i} style={{...S.card, margin:0}}>
            <span style={S.lbl}>{k.label}</span>
            <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
            <div style={{...S.muted, marginTop:4}}>{k.sub}</div>
            <div style={S.bar}><BarFill pct={k.pct} color={k.color}/></div>
          </div>
        ))}
      </div>

      {/* ALERTAS */}
      {s.criticalAlerts && s.criticalAlerts.length > 0 && (
        <div style={{...S.card}}>
          <span style={S.lbl}>ALERTAS CRITICAS · ACCION INMEDIATA</span>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {s.criticalAlerts.map((a: any, i: number) => (
              <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:'rgba(255,107,107,0.05)', border:'1px solid rgba(255,107,107,0.2)', borderRadius:10 }}>
                <span style={{ fontSize:18, flexShrink:0 }}>{a.icon||'!'}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:'#F0F2FF', marginBottom:2 }}>{a.title}</div>
                  <div style={{ fontSize:11, color:'#9CA3AF' }}>{a.description}</div>
                  {a.action && <div style={{ fontSize:10, color:'#FF6B6B', marginTop:4, fontWeight:600 }}>{a.action}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* COMPETIDORES */}
      {setupCompetitors.length > 0 && (
        <div style={{...S.card, marginBottom:14}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <span style={{ fontSize:13, fontWeight:700, color:'#F0F2FF' }}>Competidores monitoreados</span>
            <span style={{...S.badge, background:'rgba(255,255,255,0.05)', color:'#5A627A'}}>{setupCompetitors.length} activos</span>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {setupCompetitors.map((name: string, i: number) => {
              const colors = ['#FF6B6B','#F2C063','#8B7BFF','#6EE7A4','#5DD4D4']
              const labels = ['CRITICO','VIGILAR','MEDIO','BAJO','BAJO']
              const comp = (s.competitors||[]).find((c:any)=>c.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
              const threat = comp?.threat||(5-i)
              return (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background:'rgba(255,255,255,0.02)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10 }}>
                  <GaugeCircle value={threat} color={colors[i%colors.length]}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#F0F2FF' }}>{name}</div>
                    <div style={S.muted}>{city ? city+' · ':''}{industry}</div>
                    <div style={S.bar}><BarFill pct={threat*10} color={colors[i%colors.length]}/></div>
                  </div>
                  <span style={{...S.badge, background:colors[i%colors.length]+'20', color:colors[i%colors.length]}}>{labels[i%labels.length]}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* OPORTUNIDADES */}
      {s.opportunities && s.opportunities.length > 0 && (
        <div style={{...S.card, marginBottom:14}}>
          <span style={S.lbl}>OPORTUNIDADES IDENTIFICADAS</span>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
            {s.opportunities.slice(0,4).map((o: any, i: number) => (
              <div key={i} style={{ padding:'10px 12px', background:'rgba(110,231,164,0.04)', border:'1px solid rgba(110,231,164,0.15)', borderRadius:10 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                  <span style={{ fontSize:16 }}>{o.icon||'+'}</span>
                  <div style={{ fontSize:11, fontWeight:700, color:'#F0F2FF' }}>{o.title}</div>
                </div>
                <div style={{ fontSize:10, color:'#9CA3AF', lineHeight:1.4 }}>{o.description}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PDF */}
      {selectedReport?.r2Url && (
        <div style={{...S.card, marginBottom:14}}>
          <span style={S.lbl}>REPORTE PDF</span>
          <a href={selectedReport.r2Url} target="_blank" rel="noreferrer"
            style={{ display:'inline-block', background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', color:'#0D0F1A', textDecoration:'none', padding:'10px 24px', borderRadius:20, fontSize:12, fontWeight:800, marginTop:8 }}>
            Descargar PDF →
          </a>
        </div>
      )}

      {/* MODAL EDITAR PERFIL */}
      {showEditProfile && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1A1730', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:32, width:400, maxWidth:'90vw' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>Editar perfil</div>
              <button onClick={()=>setShowEditProfile(false)} style={{ background:'none', border:'none', color:'#5A627A', cursor:'pointer', fontSize:20 }}>x</button>
            </div>
            <label style={{ fontSize:10, fontWeight:700, color:'#5A627A', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>NOMBRE DE EMPRESA</label>
            <input value={editName} onChange={e=>setEditName(e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#F0F2FF', fontSize:13, outline:'none', boxSizing:'border-box' as const }}/>
            <button onClick={async()=>{
              const { data: { session } } = await supabase.auth.getSession()
              if (!session) return
              await fetch(`${BACKEND}/api/onboarding/save`, {
                method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
                body:JSON.stringify({userId:user?.id,companyName:editName})
              })
              setShowEditProfile(false); window.location.reload()
            }} style={{ width:'100%', marginTop:16, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
              Guardar cambios
            </button>
          </div>
        </div>
      )}

      {/* MODAL INVITAR */}
      {showInviteModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
          <div style={{ background:'#1A1730', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:32, width:420, maxWidth:'90vw' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>Invitar Colegas</div>
              <button onClick={()=>{setShowInviteModal(false);setInviteSent(false);setInviteEmails('')}} style={{ background:'none', border:'none', color:'#5A627A', cursor:'pointer', fontSize:20 }}>x</button>
            </div>
            {!inviteSent ? (
              <>
                <p style={{ fontSize:13, color:'#9CA3AF', marginBottom:16, lineHeight:1.6 }}>Agrega los emails de tus colegas para que tambien reciban el reporte.</p>
                <label style={{ fontSize:10, fontWeight:700, color:'#5A627A', letterSpacing:'0.1em', display:'block', marginBottom:6 }}>EMAILS (separados por coma)</label>
                <textarea value={inviteEmails} onChange={e=>setInviteEmails(e.target.value)} placeholder="colega1@empresa.com, colega2@empresa.com"
                  style={{ width:'100%', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:10, padding:'10px 14px', color:'#F0F2FF', fontSize:13, outline:'none', boxSizing:'border-box' as const, resize:'none', height:80 }}/>
                <button onClick={()=>setInviteSent(true)} style={{ width:'100%', marginTop:16, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                  Enviar invitacion
                </button>
              </>
            ) : (
              <div style={{ textAlign:'center', padding:'20px 0' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>OK</div>
                <div style={{ fontSize:15, fontWeight:700, color:'#6EE7A4', marginBottom:8 }}>Invitaciones enviadas</div>
                <div style={{ fontSize:13, color:'#9CA3AF' }}>Tus colegas recibiran el proximo reporte automaticamente.</div>
                <button onClick={()=>{setShowInviteModal(false);setInviteSent(false);setInviteEmails('')}}
                  style={{ marginTop:20, background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)', borderRadius:20, padding:'10px 24px', color:'#F0F2FF', fontSize:13, fontWeight:700, cursor:'pointer' }}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  )
}
