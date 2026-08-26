'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'

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

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
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
  const [stripeConfirmado, setStripeConfirmado] = useState(false)
  const [endingTrial, setEndingTrial] = useState(false)

  const handleEndTrial = async () => {
    if (!user) return
    setEndingTrial(true)
    try {
      const { data: { session: s2 } } = await supabase.auth.getSession()
      if (!s2) return
      const res = await fetch(`${BACKEND}/api/account/${user.id}/end-trial`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + s2.access_token },
      })
      const data = await res.json()
      if (data.status === 'active') {
        const dashRes = await fetch(BACKEND + '/api/dashboard/' + user.id, {
          headers: { 'Authorization': 'Bearer ' + s2.access_token }
        })
        setDashData(await dashRes.json())
      } else if (data.status === 'past_due') {
        alert('Tu tarjeta fue rechazada. Actualiza tu método de pago para activar tu plan.')
      } else if (data.error) {
        alert('Error: ' + data.error)
      }
    } catch (e: any) {
      alert('Error: ' + e.message)
    } finally {
      setEndingTrial(false)
    }
  }
  // Bug #5: Modal de confirmación antes de generar
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  // Bug #6: Modal elegante de límite de frecuencia
  const [showLimitModal, setShowLimitModal] = useState(false)
  const [limitMessage, setLimitMessage] = useState('')
  const [nextReportInfo, setNextReportInfo] = useState('')

  // Calcular si el usuario puede generar un reporte ahora
  const canGenerate = (() => {
    if (!dashData) return false
    if (generating) return false
    const hayGenerando = (dashData?.reports || []).some((r: any) => r.status === 'GENERATING')
    if (hayGenerando) return false
    const lastReport = (dashData?.reports || []).find((r: any) => r.status === 'COMPLETED')
    if (!lastReport) return true
    const freq = dashData?.project?.frequency || 'WEEKLY'
    const horasMinimas: Record<string, number> = { DAILY: 22, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720 }
    const horasDesde = (Date.now() - new Date(lastReport.createdAt).getTime()) / (1000 * 60 * 60)
    return horasDesde >= (horasMinimas[freq] || 168)
  })()

  // Calcular fecha del próximo reporte disponible
  const proximaFechaReporte = (() => {
    if (!dashData) return null
    const lastReport = (dashData?.reports || []).find((r: any) => r.status === 'COMPLETED')
    if (!lastReport) return null
    const freq = dashData?.project?.frequency || 'WEEKLY'
    const horasMinimas: Record<string, number> = { DAILY: 22, WEEKLY: 168, BIWEEKLY: 336, MONTHLY: 720 }
    const horas = horasMinimas[freq] || 168
    const proximaFecha = new Date(new Date(lastReport.createdAt).getTime() + horas * 60 * 60 * 1000)
    return proximaFecha
  })()
  // Bug #4: Polling más rápido durante generación
  const [pollingActive, setPollingActive] = useState(false)
  const pollingRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const [countdown, setCountdown] = useState(600)
  const [stuckMinutes, setStuckMinutes] = useState(0)
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setIsDark(saved === 'dark')
  }, [])
  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  // Paleta de colores según tema
  const T = isDark ? {
    bg: '#0D0F1A', bgCard: 'rgba(255,255,255,0.03)', bgCard2: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.1)',
    text: '#F0F2FF', textMuted: '#5A627A', textSub: '#9CA3AF',
    navBg: '#0D0F1A', navBorder: 'rgba(255,255,255,0.06)',
    lbl: '#5A627A', barBg: 'rgba(255,255,255,0.06)',
    modalBg: '#1A1730', inputBg: 'rgba(255,255,255,0.04)',
  } : {
    bg: '#EEEDFE', bgCard: '#FFFFFF', bgCard2: '#F0EEFF',
    border: '#CECBF6', border2: '#AFA9EC',
    text: '#26215C', textMuted: '#7F77DD', textSub: '#534AB7',
    navBg: '#26215C', navBorder: '#3C3489',
    lbl: '#534AB7', barBg: '#EEEDFE',
    modalBg: '#FFFFFF', inputBg: '#F0EEFF',
  }
  const isMobile = useIsMobile()
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      const user = session.user
      setUser(user)
      setToken(session.access_token)
      posthog.identify(user.id, { email: user.email })

      // Si viene de checkout, verificar sesion de Stripe antes de cargar dashboard
      const sid = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('sid') : null
      if (sid) {
        try {
          await fetch(`${BACKEND}/api/stripe/verify-session/${sid}`, {
            headers: { 'Authorization': 'Bearer ' + session.access_token }
          })
        } catch(e) {}
      }

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

  // Bug #5: Mostrar modal de confirmación antes de generar
  const handleGenerateClick = () => {
    if (!dashData?.project?.id) return
    // Si ya hay un reporte generándose, mostrar modal de límite
    const reporteEnProceso = (dashData?.reports || []).some((r: any) => r.status === 'GENERATING')
    if (reporteEnProceso) {
      setLimitMessage('Ya hay un reporte en proceso.')
      setNextReportInfo('El reporte tarda entre 5 y 10 minutos. Te avisamos por email cuando esté listo.')
      setShowLimitModal(true)
      return
    }
    setShowConfirmModal(true)
  }

  // Bug #4: Ejecutar generación real con spinner + polling cada 10s
  const handleGenerateReport = async () => {
    setShowConfirmModal(false)
    if (!dashData?.project?.id) return

    startPolling()
    try {
      const res = await fetch(`${BACKEND}/api/reports/generate/${dashData.project.id}`, {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token }
      })
      const data = await res.json()
      if (data.success) {
        posthog.capture('report_generated', {
          project_id: dashData.project.id,
          frequency: dashData.project?.frequency,
          company_name: dashData.setup?.companyName,
        })
        // No recargar — el polling detectará el reporte listo
        // Refrescar dashData para mostrar el reporte GENERATING inmediatamente
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (s2) {
          const res2 = await fetch(`${BACKEND}/api/dashboard/${s2.user.id}`, {
            headers: { 'Authorization': 'Bearer ' + s2.access_token }
          })
          const data2 = await res2.json()
          setDashData(data2)
        }
      } else if (data.error === 'trial_limit') {
        stopPolling()
        router.push('/checkout?expired=1')
      } else if (data.error === 'frequency_limit') {
        // Bug #6: Modal elegante en vez de alert()
        stopPolling()
        setLimitMessage(data.message || 'Límite de frecuencia alcanzado.')
        // Calcular tiempo exacto al próximo reporte
        const freqDays: Record<string,number> = { DAILY:1, WEEKLY:7, BIWEEKLY:15, MONTHLY:30 }
        const lastReport = (dashData?.reports || []).find((r: any) => r.status === 'COMPLETED')
        const freq = dashData?.project?.frequency || 'WEEKLY'
        if (lastReport) {
          const diasFreq = freqDays[freq] || 7
          const msDesde = Date.now() - new Date(lastReport.createdAt).getTime()
          const horasDesde = msDesde / (1000 * 60 * 60)
          const horasRestantes = Math.max(0, diasFreq * 24 - horasDesde)
          const diasRestantes = Math.floor(horasRestantes / 24)
          const hrsRestantes = Math.floor(horasRestantes % 24)
          if (diasRestantes > 0) {
            setNextReportInfo(`Tu próximo reporte estará disponible en ${diasRestantes} día${diasRestantes !== 1 ? 's' : ''}${hrsRestantes > 0 ? ` y ${hrsRestantes}h` : ''}.`)
          } else if (hrsRestantes > 0) {
            setNextReportInfo(`Tu próximo reporte estará disponible en ${hrsRestantes} hora${hrsRestantes !== 1 ? 's' : ''}.`)
          } else {
            setNextReportInfo('Tu próximo reporte ya está disponible. Intenta de nuevo.')
          }
        } else {
          setNextReportInfo('Verifica tu plan o contacta soporte.')
        }
        setShowLimitModal(true)
      } else if (data.error === 'generating') {
        // Calcular cuánto lleva el reporte generándose
        const reporteGenerando = (dashData?.reports || []).find((r: any) => r.status === 'GENERATING')
        const minutosGenerando = reporteGenerando
          ? Math.round((Date.now() - new Date(reporteGenerando.createdAt).getTime()) / (1000 * 60))
          : 0
        setStuckMinutes(minutosGenerando)
        if (minutosGenerando >= 10) {
          // Lleva más de 10 min — probablemente stuck, permitir reintentar
          stopPolling()
          setLimitMessage('El reporte anterior tardó demasiado y fue cancelado automáticamente.')
          setNextReportInfo('Puedes generar un nuevo reporte ahora.')
          setShowLimitModal(true)
        } else {
          // Está generándose normalmente
          startPolling()
          setStuckMinutes(minutosGenerando)
          setLimitMessage('Ya hay un reporte generándose.')
          setNextReportInfo(`Lleva ${minutosGenerando} min. Se desbloquea automáticamente a los 10 min.`)
          setShowLimitModal(true)
        }
      } else if (data.error) {
        stopPolling()
        setLimitMessage(data.message || data.error)
        setNextReportInfo('')
        setShowLimitModal(true)
      }
    } catch(e) {
      console.error('Error generando reporte:', e)
      stopPolling()
    }
  }

  // Polling robusto con useRef — evita race conditions y intervals fantasma
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    setCountdown(600)
    setPollingActive(false)
    setGenerating(false)
  }, [])

  const startPolling = useCallback(() => {
    if (pollingRef.current) return // ya está corriendo
    setPollingActive(true)
    setGenerating(true)
    setCountdown(600)
    if (countdownRef.current) clearInterval(countdownRef.current)
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownRef.current!); return 0 }
        return prev - 1
      })
    }, 1000)
    pollingRef.current = setInterval(async () => {
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (!s2) { stopPolling(); return }
        const res = await fetch(`${BACKEND}/api/dashboard/${s2.user.id}`, {
          headers: { 'Authorization': 'Bearer ' + s2.access_token }
        })
        const data = await res.json()
        const sigueGenerando = (data?.reports || []).some((r: any) => r.status === 'GENERATING')
        setDashData(data)
        const latest = (data.reports || []).find((r: any) => r.sectionsJson) || (data.reports || []).find((r: any) => r.status === 'COMPLETED')
        if (latest) setSelectedReport(latest)
        if (!sigueGenerando) {
          stopPolling()
        }
      } catch(e) {}
    }, 8000)
  }, [stopPolling])

  // Detectar reportes GENERATING al cargar el dashboard — con auto-desbloqueo a los 10 min
  useEffect(() => {
    if (!dashData) return
    const reporteGenerando = (dashData?.reports || []).find((r: any) => r.status === 'GENERATING')
    const hayGenerando = !!reporteGenerando
    if (hayGenerando) {
      const minutosGenerando = Math.round((Date.now() - new Date(reporteGenerando.createdAt).getTime()) / (1000 * 60))
      setStuckMinutes(minutosGenerando)
      if (minutosGenerando >= 10) {
        // Reporte stuck — desbloquear automáticamente
        console.log('[Dashboard] Reporte stuck +10min — desbloqueando automáticamente')
        stopPolling()
      } else if (!pollingRef.current) {
        startPolling()
      }
    } else if (!hayGenerando && pollingRef.current) {
      stopPolling()
    }
  }, [dashData?.reports])

  // Limpiar interval al desmontar el componente
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [])

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

  const handleDownload = async (reportId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      const res = await fetch(BACKEND + '/api/reports/signed-url/' + reportId, {
        headers: { 'Authorization': 'Bearer ' + session.access_token }
      })
      const data = await res.json()
      if (data.url) {
        posthog.capture('report_downloaded', { report_id: reportId })
        window.location.href = data.url
      } else {
        alert('Error al descargar: ' + (data.error || 'intenta de nuevo'))
      }
    } catch(e) { console.error('Error descargando:', e) }
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





  // FIX LOOP: cuando trial vencido, polling 30s esperando webhook de Stripe
  useEffect(() => {
    if (!dashData || !token || stripeConfirmado) return
    const tieneStripeLocal = dashData?.subscription?.stripeSubscriptionId != null
    if (tieneStripeLocal) { setStripeConfirmado(true); return }
    const trialVencidoLocal = dashData?.project?.trialEndsAt &&
      new Date(dashData.project.trialEndsAt) < new Date()
    if (!trialVencidoLocal) return
    let attempts = 0; let stopped = false
    const poll = async () => {
      if (stopped || attempts >= 10) return
      attempts++
      try {
        const { data: { session: s2 } } = await supabase.auth.getSession()
        if (!s2 || stopped) return
        const res = await fetch(BACKEND + '/api/dashboard/' + s2.user.id, {
          headers: { 'Authorization': 'Bearer ' + s2.access_token }
        })
        const data = await res.json()
        const subActiva = data?.subscription?.stripeSubscriptionId &&
          ['ACTIVE','TRIALING'].includes(data?.subscription?.status || '')
        if (subActiva) { stopped = true; setStripeConfirmado(true); setDashData(data) }
        else if (attempts < 10) setTimeout(poll, 3000)
      } catch(e) { if (attempts < 10) setTimeout(poll, 3000) }
    }
    setTimeout(poll, 3000)
    return () => { stopped = true }
  }, [token, dashData?.project?.id])

  const trialExpiredForCapture = !loading &&
    !(dashData?.subscription?.stripeSubscriptionId != null || stripeConfirmado) &&
    dashData?.project?.trialEndsAt &&
    new Date(dashData.project.trialEndsAt) < new Date()

  useEffect(() => {
    if (trialExpiredForCapture) posthog.capture('trial_expired_viewed')
  }, [trialExpiredForCapture])

  if (loading) return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:32, height:32, borderRadius:'50%', border:'2px solid rgba(139,123,255,0.3)', borderTopColor:'#8B7BFF', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </main>
  )

  // Bloqueo trial vencido: si trialEndsAt ya paso Y no hay stripeSubscriptionId activo
  const tieneStripe = dashData?.subscription?.stripeSubscriptionId != null || stripeConfirmado
  const trialVencido = !tieneStripe &&
    dashData?.project?.trialEndsAt &&
    new Date(dashData.project.trialEndsAt) < new Date()


  if (trialVencido) return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:T.text, fontFamily:'system-ui,sans-serif', display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div style={{ maxWidth:480, width:'100%', textAlign:'center' }}>
        <div style={{ width:64, height:64, background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.3)', borderRadius:20, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, margin:'0 auto 24px' }}>🔒</div>
        <h1 style={{ fontSize:24, fontWeight:900, marginBottom:12 }}>Tu periodo de prueba ha terminado</h1>
        <p style={{ fontSize:14, color:T.textSub, lineHeight:1.6, marginBottom:28 }}>
          Activa tu plan para seguir recibiendo inteligencia competitiva automatizada.
          Desde <strong style={{ color:'#8B7BFF' }}>$49 USD/mes</strong>. Sin compromisos, cancela cuando quieras.
        </p>
        <button onClick={() => router.push('/checkout?expired=1')}
          style={{ background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'14px 36px', color:'#0D0F1A', fontSize:14, fontWeight:900, cursor:'pointer', marginBottom:16, width:'100%' }}>
          Ver planes y activar
        </button>
        <button onClick={handleLogout}
          style={{ background:'transparent', border:`1px solid ${T.border2}`, borderRadius:20, padding:'10px 24px', color:T.textMuted, fontSize:12, fontWeight:600, cursor:'pointer', width:'100%' }}>
          Cerrar sesion
        </button>
      </div>
    </main>
  )

  return (
    <main style={{ minHeight:'100vh', background:T.bg, color:T.text, fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif', overflowX:'hidden', transition:'background 0.2s, color 0.2s' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} @keyframes spin{to{transform:rotate(360deg)}} button:active{opacity:0.7!important;transform:scale(0.97);transition:opacity 0.1s,transform 0.1s} a:active{opacity:0.7!important;transform:scale(0.97)}`}</style>

      {/* NAVBAR */}
      <nav style={{ borderBottom:`1px solid ${T.navBorder}`, background:T.navBg, position:'sticky', top:0, zIndex:50, padding: isMobile ? '10px 16px' : '0 28px', height: isMobile ? 'auto' : 56, display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap: isMobile ? 'wrap' : 'nowrap', gap: isMobile ? 8 : 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <img src={isDark ? '/logo-full.png' : '/logo-full-dark.png'} alt="Omni Reports" style={{ height: isMobile ? 28 : 34, width:'auto' }} />
          <div style={{ fontSize:10, color: isDark ? T.textMuted : "#AFA9EC" }}>Inteligencia Competitiva · AI</div>
        </div>
        <div style={{ display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-end' : 'center', gap: isMobile ? 4 : 14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'4px 10px' }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#6EE7A4', flexShrink:0 }} />
            <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.08em', color:'#6EE7A4' }}>SISTEMA ACTIVO</span>
          </div>
          {!isMobile && <span style={{ fontSize:12, color: isDark ? T.textMuted : "#AFA9EC" }}>{user?.email}</span>}
          <button onClick={toggleTheme} style={{ fontSize:18, background:'none', border:'none', cursor:'pointer', padding:'4px 6px', borderRadius:8, lineHeight:1, opacity: isDark ? 1 : 0.9 }} title={isDark ? 'Modo claro' : 'Modo oscuro'}>
            {isDark ? '☀️' : '🌙'}
          </button>
          <Link href="/cuenta" style={{ fontSize:11, color: isDark ? T.textMuted : "#AFA9EC", fontWeight:600, textDecoration:'none', marginTop: isMobile ? 4 : 0 }}>Mi cuenta</Link>
          <button onClick={handleLogout} style={{ fontSize:11, color: isDark ? T.textMuted : "#AFA9EC", background:'none', border:'none', cursor:'pointer', fontWeight:600, marginTop: isMobile ? 4 : 0 }}>Salir →</button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:'0 auto', padding: isMobile ? '16px 16px 60px' : '28px 28px 60px' }}>

        {/* ZONA 1 — HEADER con datos reales */}
        <div style={{ marginBottom:20 }}>
          <span style={{...S.lbl, color:T.lbl}}>DASHBOARD · INTELIGENCIA COMPETITIVA</span>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:8 }}>
            <div>
              <div style={{ fontSize: isMobile ? 22 : 26, fontWeight:900, color: isDark ? T.text : '#26215C', lineHeight:1.1 }}>
                <span style={{ color: isDark ? '#8B7BFF' : '#26215C' }}>{companyName}</span>
              </div>
              <div style={{ fontSize:12, color:T.textMuted, marginTop:4 }}>
                {industry}{city ? ` · ${city}, ${country}` : ` · ${country}`} · {new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'})}
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, flexWrap:'wrap' }}>
                {tieneStripe ? (
                  <span style={{ fontSize:11, color:'#6EE7A4', fontWeight:700, background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'3px 10px' }}>✓ Plan {frequency} activo</span>
                ) : (
                  <>
                    <span style={{ fontSize:11, color:'#F2C063', fontWeight:700, background:'rgba(242,192,99,0.1)', border:'1px solid rgba(242,192,99,0.2)', borderRadius:20, padding:'3px 10px' }}>Trial · {trialDaysLeft} días restantes</span>
                    {dashData?.subscription?.status === 'TRIALING' && (
                      <button onClick={handleEndTrial} disabled={endingTrial}
                        style={{ fontSize:11, fontWeight:700, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.25)', borderRadius:20, padding:'3px 10px', cursor: endingTrial ? 'not-allowed' : 'pointer' }}>
                        {endingTrial ? 'Activando...' : 'Activar ahora'}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
            {selectedReport && selectedReport.r2Key && (
              <button onClick={() => handleDownload(selectedReport.id)}
                style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:700, color:'#0D0F1A', background:'#8B7BFF', borderRadius:20, padding:'8px 16px', border:'none', cursor:'pointer', marginTop: isMobile ? 8 : 0, alignSelf:'flex-start' }}>
                <span>↓ PDF</span>
                {isMobile && <span style={{ fontSize:10, fontWeight:600 }}>Descarga tu reporte de Inteligencia Competitiva</span>}
              </button>
            )}
          </div>
        </div>
        {/* ZONA 6 — PRÓXIMO REPORTE */}
        <div style={{...S.card, background:'rgba(139,123,255,0.06)', borderColor:'rgba(139,123,255,0.2)'}}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems: isMobile ? 'flex-start' : 'center', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 12 : 0 }}>
            <div>
              <span style={{...S.lbl, color:'#8B7BFF'}}>PRÓXIMO REPORTE · {dashData?.project?.frequency || 'SEMANAL'}</span>
              <div style={{ fontSize:16, fontWeight:800, color:T.text, lineHeight:1.3 }}>Inteligencia Competitiva<br/><span style={{ color:'#8B7BFF' }}>{companyName}</span></div>
              <div style={{...S.muted, marginTop:3}}>
                {dashData?.project?.deliveryEmail || 'Email'} · {(dashData?.setup?.focusAreas || []).length} áreas activas
                {' · '}
                {(() => {
                  const channels = dashData?.project?.deliveryChannels || []
                  const hasWhatsapp = channels.includes('WHATSAPP')
                  if (hasWhatsapp) return 'Entrega por Email + WhatsApp'
                  return 'Entrega por Email'
                })()}
              </div>
              <div style={{ display:'flex', gap:5, marginTop:8, flexWrap:'wrap' }}>
                {(dashData?.setup?.focusAreas || ['Precios','Campañas','Lanzamientos']).map((a: string) => (
                  <span key={a} style={{...S.badge, background:'rgba(139,123,255,0.15)', color:'#8B7BFF'}}>{a}</span>
                ))}
              </div>
            </div>
            <div style={{ flexShrink:0, paddingLeft: isMobile ? 0 : 20, display:'flex', flexDirection:'column', gap:8, minWidth: isMobile ? '100%' : 260 }}>
              {(() => {
                const freqDays: Record<string,number> = { DAILY:1, WEEKLY:7, BIWEEKLY:15, MONTHLY:30 }
                const lastReport = (dashData?.reports || []).find((r:any) => r.status === 'COMPLETED')
                const diasFreq = freqDays[frequency] || 7
                if (!lastReport) return <span style={{ fontSize:11, color:'#8B7BFF', fontWeight:600, background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'4px 12px', textAlign:'center' as const }}>Pronto</span>
                const diasDesde = Math.floor((Date.now() - new Date(lastReport.createdAt).getTime()) / (1000*60*60*24))
                const diasFaltan = Math.max(0, diasFreq - diasDesde)
                return (
                  <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:12, fontWeight:600, borderRadius:20, padding:'6px 14px', width:'100%',
                    color: generating ? '#BEF264' : '#8B7BFF',
                    background: generating ? 'rgba(190,242,100,0.12)' : 'rgba(139,123,255,0.1)',
                    border: generating ? '1px solid rgba(190,242,100,0.35)' : '1px solid rgba(139,123,255,0.2)' }}>
                    {generating ? '⚡ Generando tu reporte ahora...' : diasFaltan === 0 ? '🕐 Tu próximo reporte está listo para generar' : `🕐 Tu próximo reporte estará disponible en ${diasFaltan} día${diasFaltan === 1 ? '' : 's'}`}
                  </span>
                )
              })()}
              <button
                onClick={canGenerate && !generating ? handleGenerateClick : undefined}
                disabled={!canGenerate || generating}
                style={{
                  width:'100%', padding:'11px 14px', borderRadius:20, border:'none',
                  fontSize:13, fontWeight:700, cursor: canGenerate && !generating ? 'pointer' : 'not-allowed',
                  background: generating ? '#86EFAC' : canGenerate ? '#22C55E' : 'rgba(255,255,255,0.04)',
                  color: generating || canGenerate ? '#06210F' : '#5A627A',
                  display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  opacity: (!canGenerate && !generating) ? 0.6 : 1
                }}>
                {generating && (
                  <div style={{ width:14, height:14, border:'2px solid rgba(6,33,15,0.3)', borderTopColor:'#06210F', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
                )}
                {generating ? `Generando... ${Math.floor(countdown/60)}:${String(countdown%60).padStart(2,'0')}` : canGenerate ? 'Generar reporte' : 'No disponible aún'}
              </button>
            </div>
          </div>
        </div>

        {/* ZONA 7 — PANEL USUARIO */}
        <div style={{ background:'linear-gradient(135deg,rgba(139,123,255,0.08),rgba(93,212,212,0.04))', border:'1px solid rgba(139,123,255,0.2)', borderRadius:16, padding:'20px 22px', marginBottom:14 }}>
          <div style={{ paddingBottom:14, borderBottom:`1px solid ${T.border}`, marginBottom:14, display:'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', justifyContent:'space-between', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:42, height:42, borderRadius:12, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#0D0F1A', flexShrink:0 }}>
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:14, fontWeight:800, color:T.text, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.email || 'usuario@email.com'}</div>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, flexWrap:'wrap' }}>
                  <span style={{...S.badge, background: tieneStripe ? 'rgba(110,231,164,0.12)' : 'rgba(242,192,99,0.12)', color: tieneStripe ? '#6EE7A4' : '#F2C063'}}>
                    {tieneStripe ? 'Activo' : `Trial · ${trialDaysLeft} días`}
                  </span>
                  <span style={{ fontSize:10, color:T.textMuted }}>· Plan {frequency}</span>
                  {city && <span style={{ fontSize:10, color:T.textMuted }}>· {city}, {country}</span>}
                </div>
              </div>
            </div>
            {isMobile && <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              <button onClick={()=>{setEditName(dashData?.setup?.companyName||'');setShowEditProfile(true)}} style={{ fontSize:10, fontWeight:600, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'6px 12px', cursor:'pointer', whiteSpace:'nowrap' }}>Editar Perfil</button>
              <button onClick={handlePasswordReset} style={{ fontSize:10, fontWeight:600, color: passwordSent ? '#6EE7A4' : '#9CA3AF', background:T.inputBg, border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'6px 12px', cursor:'pointer', whiteSpace:'nowrap' }}>{passwordSent ? '✓ Email enviado' : 'Cambiar contraseña'}</button>
              {tieneStripe && (
                <button onClick={() => router.push('/upgrade')} style={{ fontSize:10, fontWeight:600, color:'#6EE7A4', background:'rgba(110,231,164,0.08)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'6px 12px', cursor:'pointer', whiteSpace:'nowrap' }}>
                  Gestionar suscripción →
                </button>
              )}
            </div>}
            {!isMobile && <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:'auto' }}>
              <button onClick={()=>{setEditName(dashData?.setup?.companyName||'');setShowEditProfile(true)}} style={{ fontSize:12, fontWeight:600, color:'#8B7BFF', background:'rgba(139,123,255,0.1)', border:'1px solid rgba(139,123,255,0.2)', borderRadius:20, padding:'8px 18px', cursor:'pointer', whiteSpace:'nowrap' }}>Editar Perfil</button>
              <button onClick={handlePasswordReset} style={{ fontSize:12, fontWeight:600, color: passwordSent ? '#6EE7A4' : '#9CA3AF', background:T.inputBg, border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:'8px 18px', cursor:'pointer', whiteSpace:'nowrap' }}>{passwordSent ? '✓ Email enviado' : 'Cambiar contraseña'}</button>
              {tieneStripe && (
                <button onClick={() => router.push('/upgrade')} style={{ fontSize:12, fontWeight:600, color:'#6EE7A4', background:'rgba(110,231,164,0.08)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'8px 18px', cursor:'pointer', whiteSpace:'nowrap' }}>
                  Gestionar suscripción →
                </button>
              )}
            </div>}
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10 }}>
            {[
              { label:'Editar Configuración para Reportes', color:'#8B7BFF', bg:'rgba(139,123,255,0.12)', border:'rgba(139,123,255,0.3)', href:'/onboarding',
                icon:<path d="M12 20h9M16.5 3.5a2.12 2.12 0 113 3L7 19l-4 1 1-4z"/> },
              { label: generating ? 'Generando...' : canGenerate ? 'Generar Reporte' : proximaFechaReporte ? 'Próximo: ' + proximaFechaReporte.toLocaleDateString('es-MX', {day:'2-digit', month:'short'}) + ' ' + proximaFechaReporte.toLocaleTimeString('es-MX', {hour:'2-digit', minute:'2-digit'}) : 'Generar Reporte', color: canGenerate || generating ? '#6EE7A4' : '#5A627A', bg: canGenerate || generating ? 'rgba(110,231,164,0.08)' : 'rgba(255,255,255,0.02)', border: canGenerate || generating ? 'rgba(110,231,164,0.2)' : 'rgba(255,255,255,0.06)', href:'#', onClick: canGenerate && !generating ? handleGenerateClick : undefined,
                icon:<><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></> },
              { label:`${(dashData?.reports || []).filter((r: any) => r.status !== 'FAILED').length} Reportes`, color:'#F2C063', bg:'rgba(242,192,99,0.08)', border:'rgba(242,192,99,0.2)', href:'#',
                icon:<path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/> },
              { label:'Invitar Colegas', color:T.textSub, bg: isDark ? 'rgba(255,255,255,0.04)' : '#F8F7FF', border: isDark ? 'rgba(255,255,255,0.1)' : '#CECBF6', href:'#', onClick: ()=>setShowInviteModal(true),
                icon:<><path d="M17 21v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></> },
            ].map((a: any,i: number)=>(
              <a key={i} href={a.href} onClick={a.onClick ? (e)=>{e.preventDefault();a.onClick()} : undefined}
                style={{ padding: isMobile ? '20px 16px' : '16px 14px', background:a.bg, border:`1px solid ${a.border}`, borderRadius:16, color:a.color, fontSize: isMobile ? 13 : 12, fontWeight:700, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'flex-start', gap:12, textDecoration:'none', minHeight: isMobile ? 100 : 'auto' }}>
                {/* Bug #4: spinner cuando está generando */}
                {generating && a.label.includes('Generando') ? (
                  <div style={{ width: isMobile ? 22 : 18, height: isMobile ? 22 : 18, border:'2px solid rgba(110,231,164,0.3)', borderTopColor:'#6EE7A4', borderRadius:'50%', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                ) : (
                  <svg width={isMobile ? 22 : 18} height={isMobile ? 22 : 18} viewBox="0 0 24 24" fill="none" stroke={a.color} strokeWidth="2">{a.icon}</svg>
                )}
                <span style={{ lineHeight:1.3 }}>{a.label}</span>
                {generating && a.label.includes('Generando') && (
                  <span style={{ fontSize:10, color:'rgba(110,231,164,0.7)', fontWeight:500 }}>
                    {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')} min
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>

        {/* ZONA 7.5 — REPORTES GENERADOS */}
        {dashData?.reports?.length > 0 && (
          <div style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, marginBottom:14, boxShadow: isDark ? 'none' : '0 1px 4px rgba(83,74,183,0.08)'}}>
            <span style={{...S.lbl, color:T.lbl}}>REPORTES GENERADOS</span>
            <div style={{ fontSize:10, color:T.textMuted, marginTop:2, marginBottom:6, fontWeight:400, letterSpacing:'0.02em' }}>
              * Disponibles para descarga por 7 días
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:6, marginTop:8 }}>
              {dashData.reports.filter((r: any) => r.status !== 'FAILED').map((r: any, i: number) => (
                <div key={i} onClick={() => r.sectionsJson && setSelectedReport(r)}
                  style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background: selectedReport?.id === r.id ? (isDark ? 'rgba(139,123,255,0.1)' : '#F0EEFF') : (isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF'), border:`1.5px solid ${selectedReport?.id === r.id ? (isDark ? 'rgba(139,123,255,0.3)' : '#8B7BFF') : T.border}`, boxShadow: isDark ? 'none' : '0 1px 3px rgba(83,74,183,0.06)', borderRadius:10, cursor: r.sectionsJson ? 'pointer' : 'default' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    {!r.reportTitle ? (
                      <div style={{ width:14, height:14, borderRadius:'50%', border:'2px solid rgba(139,123,255,0.3)', borderTopColor:'#8B7BFF', animation:'spin 0.8s linear infinite', flexShrink:0 }} />
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={selectedReport?.id === r.id ? '#8B7BFF' : '#5A627A'} strokeWidth="2"><path d="M7 3h7l5 5v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z"/></svg>
                    )}
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color: r.reportTitle ? (isDark ? '#F0F2FF' : '#26215C') : '#8B7BFF' }}>{r.reportTitle || '⏳ Generando reporte IA... 5-10 min'}</div>
                      <div style={{ fontSize:10, color:T.textMuted }}>{new Date(r.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })} · {r.pdfSizeBytes ? Math.round(r.pdfSizeBytes/1024)+'KB' : 'Procesando...'}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                    {selectedReport?.id === r.id && <span style={{ fontSize:10, color:'#8B7BFF', fontWeight:700 }}>← Viendo</span>}
                    {r.r2Key && (
                      <button onClick={e => { e.stopPropagation(); handleDownload(r.id) }}
                        style={{ fontSize:11, fontWeight:700, color: isDark ? '#8B7BFF' : '#FFFFFF', background: isDark ? 'rgba(139,123,255,0.1)' : '#534AB7', border: isDark ? '1px solid rgba(139,123,255,0.2)' : '1.5px solid #3C3489', borderRadius:20, padding:'5px 12px', cursor:'pointer' }}>
                        ↓ PDF
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZONA 7.6 — RESUMEN INTELIGENTE DEL ÚLTIMO REPORTE */}
        {selectedReport?.sectionsJson && (() => {
          const sj = typeof selectedReport.sectionsJson === 'string'
            ? JSON.parse(selectedReport.sectionsJson) : selectedReport.sectionsJson
          const score = sj?.clientScore
          const topAlerts = (sj?.criticalAlerts || []).slice(0,3)
          const topRecs = (sj?.highPriorityRecs || []).slice(0,2)
          if (!score && topAlerts.length === 0 && topRecs.length === 0) return null
          return (
            <div style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <div style={{ width:3, height:18, background:'linear-gradient(180deg,#8B7BFF,#5DD4D4)', borderRadius:2 }}/>
                <span style={{ fontSize:13, fontWeight:800, color:T.text, letterSpacing:'0.05em' }}>INTELIGENCIA DEL ÚLTIMO REPORTE</span>
                <span style={{ fontSize:10, color:T.textMuted }}>· {new Date(selectedReport.createdAt).toLocaleDateString('es-MX',{day:'2-digit',month:'short'})}</span>
              </div>

              {/* Score del cliente */}
              {score && (
                <div style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, marginBottom:10, boxShadow: isDark ? 'none' : '0 1px 4px rgba(83,74,183,0.08)'}}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:12 }}>
                    <div style={{ flex:1, minWidth:200 }}>
                      <span style={{...S.lbl, color:T.lbl}}>SCORE COMPETITIVO DE TU EMPRESA</span>
                      <div style={{ display:'flex', alignItems:'baseline', gap:8, marginBottom:8 }}>
                        <span style={{ fontSize:40, fontWeight:900, color: score.overall >= 70 ? '#6EE7A4' : score.overall >= 50 ? '#F2C063' : '#FF6B6B', lineHeight:1 }}>{score.overall}</span>
                        <span style={{ fontSize:13, color:T.textMuted }}>/100</span>
                        <span style={{ fontSize:11, color: score.vsCompetitors === 'Por encima del promedio' ? '#6EE7A4' : score.vsCompetitors === 'En el promedio' ? '#F2C063' : '#FF6B6B', fontWeight:700, background: score.vsCompetitors === 'Por encima del promedio' ? 'rgba(110,231,164,0.1)' : 'rgba(242,192,99,0.1)', padding:'2px 8px', borderRadius:20 }}>
                          {score.vsCompetitors}
                        </span>
                      </div>
                      {score.summary && <div style={{ fontSize:11, color:T.textSub, lineHeight:1.5, marginBottom:10 }}>{score.summary}</div>}
                      {/* Barras de dimensiones */}
                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                        {[
                          { label:'Precio / Valor', val: score.price, color:'#8B7BFF' },
                          { label:'Presencia digital', val: score.digital, color:'#5DD4D4' },
                          { label:'Diferenciación', val: score.differentiation, color:'#6EE7A4' },
                          { label:'Velocidad', val: score.speed, color:'#F2C063' },
                        ].map((d,i) => (
                          <div key={i}>
                            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                              <span style={{ fontSize:9, color:T.textMuted, fontWeight:700 }}>{d.label.toUpperCase()}</span>
                              <span style={{ fontSize:9, color:d.color, fontWeight:800 }}>{d.val || '—'}</span>
                            </div>
                            <div style={{height:5, background:T.barBg, borderRadius:3, overflow:"hidden", marginTop:6}}><BarFill pct={d.val || 0} color={d.color}/></div>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* Fortalezas y áreas de mejora */}
                    <div style={{ minWidth:180, display:'flex', flexDirection:'column', gap:8 }}>
                      {score.strongAreas?.length > 0 && (
                        <div>
                          <span style={{ fontSize:9, fontWeight:700, color:'#6EE7A4', letterSpacing:'0.1em', display:'block', marginBottom:4 }}>✓ FORTALEZAS</span>
                          {score.strongAreas.slice(0,2).map((a:string,i:number)=>(
                            <div key={i} style={{ fontSize:10, color:T.textSub, padding:'4px 8px', background:'rgba(110,231,164,0.06)', border:'1px solid rgba(110,231,164,0.15)', borderRadius:6, marginBottom:4 }}>{a}</div>
                          ))}
                        </div>
                      )}
                      {score.weakAreas?.length > 0 && (
                        <div>
                          <span style={{ fontSize:9, fontWeight:700, color:'#F2C063', letterSpacing:'0.1em', display:'block', marginBottom:4 }}>↑ ÁREAS DE MEJORA</span>
                          {score.weakAreas.slice(0,2).map((a:string,i:number)=>(
                            <div key={i} style={{ fontSize:10, color:T.textSub, padding:'4px 8px', background:'rgba(242,192,99,0.06)', border:'1px solid rgba(242,192,99,0.15)', borderRadius:6, marginBottom:4 }}>{a}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Top 3 alertas críticas */}
              {topAlerts.length > 0 && (
                <div style={{...S.card, marginBottom:10}}>
                  <span style={{...S.lbl, color:T.lbl}}>🔴 TOP ALERTAS CRÍTICAS DE ESTA SEMANA</span>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                    {topAlerts.map((a:any,i:number)=>(
                      <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:'rgba(255,107,107,0.05)', border:'1px solid rgba(255,107,107,0.15)', borderRadius:10 }}>
                        <span style={{ fontSize:18, flexShrink:0 }}>{a.icon || '⚠️'}</span>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:2 }}>{a.title}</div>
                          <div style={{ fontSize:10, color:T.textSub, lineHeight:1.4, marginBottom:4 }}>{a.description}</div>
                          {a.action && <div style={{ fontSize:10, color:'#FF6B6B', fontWeight:700 }}>💡 {a.action}</div>}
                          {a.detected && <div style={{ fontSize:9, color:T.textMuted, marginTop:3 }}>📅 {a.detected}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top 2 recomendaciones */}
              {topRecs.length > 0 && (
                <div style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, marginBottom:0, boxShadow: isDark ? 'none' : '0 1px 4px rgba(83,74,183,0.08)'}}>
                  <span style={{...S.lbl, color:T.lbl}}>🎯 RECOMENDACIONES PRIORITARIAS ESTA SEMANA</span>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:8 }}>
                    {topRecs.map((r:any,i:number)=>(
                      <div key={i} style={{ padding:'12px 14px', background:'rgba(139,123,255,0.05)', border:'1px solid rgba(139,123,255,0.15)', borderRadius:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8, marginBottom:6 }}>
                          <div style={{ fontSize:12, fontWeight:800, color:T.text, flex:1 }}>{r.title}</div>
                          <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                            {r.difficulty && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:10, background: r.difficulty==='FÁCIL' ? 'rgba(110,231,164,0.1)' : r.difficulty==='MEDIO' ? 'rgba(242,192,99,0.1)' : 'rgba(255,107,107,0.1)', color: r.difficulty==='FÁCIL' ? '#6EE7A4' : r.difficulty==='MEDIO' ? '#F2C063' : '#FF6B6B' }}>{r.difficulty}</span>}
                            {r.costRequired && <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', borderRadius:10, background:'rgba(255,255,255,0.05)', color:T.textSub }}>{r.costRequired}</span>}
                          </div>
                        </div>
                        <div style={{ fontSize:10, color:T.textSub, lineHeight:1.5, marginBottom:6 }}>{r.description}</div>
                        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                          {r.impact && <span style={{ fontSize:10, color:'#6EE7A4', fontWeight:600 }}>📈 {r.impact}</span>}
                          {r.deadline && <span style={{ fontSize:10, color:'#8B7BFF', fontWeight:600 }}>⏱ {r.deadline}</span>}
                          {r.owner && <span style={{ fontSize:10, color:T.textMuted }}>👤 {r.owner}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })()}

        {/* ZONA 7.7 — GRÁFICA HISTÓRICA DE MÉTRICAS */}
        {dashData?.reports && dashData.reports.filter((r:any) => r.status === 'COMPLETED' && r.sectionsJson).length >= 2 && (() => {
          const completedReports = dashData.reports
            .filter((r:any) => r.status === 'COMPLETED' && r.sectionsJson)
            .slice(0, 10)
            .reverse()
          const dataPoints = completedReports.map((r:any) => {
            const sj = typeof r.sectionsJson === 'string' ? JSON.parse(r.sectionsJson) : r.sectionsJson
            return {
              date: new Date(r.createdAt).toLocaleDateString('es-MX',{day:'2-digit',month:'short'}),
              pressure: sj?.competitivePressure || 0,
              opportunity: sj?.opportunityScore || 0,
              risk: sj?.marketRisk || 0,
              score: sj?.clientScore?.overall || null,
            }
          })
          const maxVal = 100
          const chartW = 600
          const chartH = 120
          const padL = 32, padR = 16, padT = 10, padB = 24
          const innerW = chartW - padL - padR
          const innerH = chartH - padT - padB
          const n = dataPoints.length
          const xPos = (i:number) => padL + (i / (n-1)) * innerW
          const yPos = (v:number) => padT + innerH - (v / maxVal) * innerH
          const makePath = (key:'pressure'|'opportunity'|'risk'|'score') => {
            const pts = dataPoints.map((d:any,i:number) => {
              const v = d[key]
              if (v === null || v === undefined) return null
              return `${xPos(i)},${yPos(v as number)}`
            }).filter(Boolean)
            if (pts.length < 2) return ''
            return 'M ' + pts.join(' L ')
          }
          return (
            <div style={{...S.card, marginBottom:14}}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{...S.lbl, color:T.lbl}}>📊 EVOLUCIÓN HISTÓRICA DE MÉTRICAS</span>
                <div style={{ display:'flex', gap:12 }}>
                  {[{label:'Presión',color:'#8B7BFF'},{label:'Oportunidad',color:'#6EE7A4'},{label:'Riesgo',color:'#FF6B6B'},{label:'Score',color:'#F2C063'}].map((l,i)=>(
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:4 }}>
                      <div style={{ width:12, height:2, background:l.color, borderRadius:1 }}/>
                      <span style={{ fontSize:9, color:T.textMuted, fontWeight:600 }}>{l.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ overflowX:'auto' }}>
                <svg width="100%" viewBox={`0 0 ${chartW} ${chartH}`} style={{ minWidth:300 }}>
                  {/* Grid lines */}
                  {[0,25,50,75,100].map(v=>(
                    <g key={v}>
                      <line x1={padL} y1={yPos(v)} x2={chartW-padR} y2={yPos(v)} stroke={isDark ? "rgba(255,255,255,0.05)" : "#EEEDFE"} strokeWidth="1"/>
                      <text x={padL-4} y={yPos(v)+3} fill={isDark ? "#5A627A" : "#7F77DD"} fontSize="8" textAnchor="end">{v}</text>
                    </g>
                  ))}
                  {/* Líneas de datos */}
                  {makePath('pressure') && <path d={makePath('pressure')} fill="none" stroke="#8B7BFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                  {makePath('opportunity') && <path d={makePath('opportunity')} fill="none" stroke="#6EE7A4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                  {makePath('risk') && <path d={makePath('risk')} fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>}
                  {makePath('score') && <path d={makePath('score')} fill="none" stroke="#F2C063" strokeWidth="1.5" strokeDasharray="4,3" strokeLinecap="round"/>}
                  {/* Puntos y etiquetas de fecha */}
                  {dataPoints.map((d:any,i:number)=>(
                    <g key={i}>
                      {d.pressure > 0 && <circle cx={xPos(i)} cy={yPos(d.pressure)} r="3" fill="#8B7BFF"/>}
                      {d.opportunity > 0 && <circle cx={xPos(i)} cy={yPos(d.opportunity)} r="3" fill="#6EE7A4"/>}
                      {d.risk > 0 && <circle cx={xPos(i)} cy={yPos(d.risk)} r="3" fill="#FF6B6B"/>}
                      {d.score && <circle cx={xPos(i)} cy={yPos(d.score)} r="2.5" fill="#F2C063"/>}
                      <text x={xPos(i)} y={chartH-4} fill={isDark ? "#5A627A" : "#7F77DD"} fontSize="8" textAnchor="middle">{d.date}</text>
                    </g>
                  ))}
                </svg>
              </div>
              <div style={{ fontSize:10, color:T.textMuted, marginTop:4, textAlign:'center' }}>
                Basado en {dataPoints.length} reportes generados
              </div>
            </div>
          )
        })()}

        {/* ZONA 8 — MOTORES IA */}
        <div style={{ border:`1px solid ${T.border}`, borderRadius:16, padding:'18px 20px', marginBottom:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#8B7BFF' }}/>
            <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.14em', color:T.textMuted, textTransform:'uppercase' }}>Motores IA — Automation Intelligence Omni Reports · AI Automation</span>
          </div>
          <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10 }}>
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
                <div style={{ fontSize:10, color:T.textMuted }}>{m.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ZONA 2 — KPIs con datos reales */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', marginTop:4, marginBottom:16, paddingTop:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:3, height:18, background:'linear-gradient(180deg,#8B7BFF,#5DD4D4)', borderRadius:2 }}/>
              <span style={{ fontSize:13, fontWeight:800, color:T.text, letterSpacing:'0.05em' }}>RESUMEN DEL REPORTE</span>
              {selectedReport && <span style={{ fontSize:10, color:T.textMuted }}>· {new Date(selectedReport.createdAt).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'numeric' })} {new Date(selectedReport.createdAt).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' })}</span>}
            </div>
            {selectedReport?.r2Key && (
              <button onClick={() => handleDownload(selectedReport.id)}
                style={{ display:'flex', alignItems:'center', gap:8, fontSize:11, fontWeight:700, color:'#FFFFFF', background:'#534AB7', borderRadius:20, padding:'8px 16px', border:'none', cursor:'pointer' }}>
                <span>↓ PDF</span>
                {isMobile && <span style={{ fontSize:10, fontWeight:600 }}>Descarga tu reporte de Inteligencia Competitiva</span>}
              </button>
            )}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr 1fr', gap:10, marginBottom:14 }}>
          {[
            { label:'PRESIÓN COMPETITIVA', value: s.competitivePressure ? `${s.competitivePressure}%` : '—', sub: s.generalTrend || 'Sin datos', color:'#8B7BFF', pct: s.competitivePressure || 0 },
            { label:'ALERTAS CRÍTICAS', value: s.criticalAlertsCount !== undefined ? String(s.criticalAlertsCount) : '—', sub: s.mediumAlertsCount !== undefined ? `${s.mediumAlertsCount} alertas medias` : 'Sin datos', color:'#FF6B6B', pct: s.criticalAlertsCount ? Math.min(s.criticalAlertsCount * 20, 100) : 0 },
            { label:'OPORTUNIDADES', value: s.opportunityScore ? `${s.opportunityScore}%` : '—', sub: s.opportunities ? `${s.opportunities.length} identificadas` : 'Sin datos', color:'#6EE7A4', pct: s.opportunityScore || 0 },
            { label:'RIESGO DE MERCADO', value: s.marketRisk ? `${s.marketRisk}%` : '—', sub: s.riskLevel || 'Sin datos', color:'#F2C063', pct: s.marketRisk || 0 },
          ].map((k,i)=>(
            <div key={i} style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, margin:0, boxShadow: isDark ? 'none' : '0 1px 4px rgba(83,74,183,0.08)'}}>
              <span style={{...S.lbl, color:T.lbl}}>{k.label}</span>
              <div style={{ fontSize:26, fontWeight:900, color:k.color, lineHeight:1 }}>{k.value}</div>
              <div style={{fontSize:11, color:T.textMuted, marginTop:4}}>{k.sub}</div>
              <div style={{height:5, background:T.barBg, borderRadius:3, overflow:"hidden", marginTop:6}}><BarFill pct={k.pct} color={k.color}/></div>
            </div>
          ))}
        </div>

        {/* ZONA 3 — Alertas críticas reales */}
        {s.criticalAlerts && s.criticalAlerts.length > 0 && (
          <div style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, boxShadow: isDark ? "none" : "0 1px 4px rgba(83,74,183,0.08)"}}>
            <span style={{...S.lbl, color:T.lbl}}>🔴 ALERTAS CRÍTICAS · ACCIÓN INMEDIATA</span>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {s.criticalAlerts.map((a: any, i: number) => (
                <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background: isDark ? 'rgba(255,107,107,0.05)' : '#FEF2F2', border:'1px solid rgba(255,107,107,0.25)', borderRadius:10 }}>
                  <span style={{ fontSize:18, flexShrink:0 }}>{a.icon || '⚠️'}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text, marginBottom:2 }}>{a.title}</div>
                    <div style={{ fontSize:11, color:T.textSub }}>{a.description}</div>
                    {a.action && <div style={{ fontSize:10, color:'#FF6B6B', marginTop:4, fontWeight:600 }}>💡 {a.action}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ZONA 4 — Competidores reales del setup + amenaza del reporte */}
        {setupCompetitors.length > 0 && (
          <div style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, margin:0, marginBottom:14, boxShadow: isDark ? 'none' : '0 1px 4px rgba(83,74,183,0.08)'}}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <span style={{ fontSize:13, fontWeight:700, color:T.text }}>Competidores monitoreados</span>
              <span style={{...S.badge, background:T.bgCard2, color:T.textMuted, border:`1px solid ${T.border}`}}>{setupCompetitors.length} activos</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {setupCompetitors.map((name: string, i: number) => {
                const colors = ['#FF6B6B','#F2C063','#8B7BFF','#6EE7A4','#5DD4D4']
                const labels = ['CRÍTICO','VIGILAR','MEDIO','BAJO','BAJO']
                const comp = (s.competitors || []).find((c: any) => c.name?.toLowerCase().includes(name.toLowerCase().split(' ')[0]))
                const threat = comp?.threat || (5 - i)
                return (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', background: isDark ? 'rgba(255,255,255,0.02)' : '#F8F7FF', border:`1px solid ${T.border}`, borderRadius:10 }}>
                    <GaugeCircle value={threat} color={colors[i % colors.length]}/>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:700, color:T.text }}>{name}</div>
                      <div style={{fontSize:11, color:T.textMuted}}>{city ? `${city} · ` : ''}{industry}</div>
                      <div style={{height:5, background:T.barBg, borderRadius:3, overflow:"hidden", marginTop:6}}><BarFill pct={threat*10} color={colors[i % colors.length]}/></div>
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
          <div style={{...S.card, background:T.bgCard, border:`1px solid ${T.border}`, marginBottom:14, boxShadow: isDark ? "none" : "0 1px 4px rgba(83,74,183,0.08)"}}>
            <span style={{...S.lbl, color:T.lbl}}>🟢 OPORTUNIDADES IDENTIFICADAS</span>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:8 }}>
              {s.opportunities.slice(0,4).map((o: any, i: number) => (
                <div key={i} style={{ padding:'10px 12px', background: isDark ? 'rgba(110,231,164,0.04)' : '#F0FDF4', border:'1px solid rgba(110,231,164,0.25)', borderRadius:10 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                    <span style={{ fontSize:16 }}>{o.icon || '💡'}</span>
                    <div style={{ fontSize:11, fontWeight:700, color:T.text }}>{o.title}</div>
                  </div>
                  <div style={{ fontSize:10, color:T.textSub, lineHeight:1.4 }}>{o.description}</div>
                </div>
              ))}
            </div>
          </div>
        )}



      </div>

    {/* Modal Editar Perfil */}
    {showEditProfile && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
        <div style={{ background:T.modalBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:32, width:400, maxWidth:'90vw' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.text }}>Editar perfil</div>
            <button onClick={()=>setShowEditProfile(false)} style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:20 }}>×</button>
          </div>
          <label style={{ fontSize:10, fontWeight:700, color:T.textMuted, letterSpacing:'0.1em', display:'block', marginBottom:6 }}>NOMBRE DE EMPRESA</label>
          <input
            value={editName}
            onChange={e=>setEditName(e.target.value)}
            style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'10px 14px', color:T.text, fontSize:13, outline:'none', boxSizing:'border-box' as const }}
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
        <div style={{ background:T.modalBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:32, width:420, maxWidth:'90vw' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontSize:16, fontWeight:800, color:T.text }}>Invitar Colegas</div>
            <button onClick={()=>{setShowInviteModal(false);setInviteSent(false);setInviteEmails('')}} style={{ background:'none', border:'none', color:T.textMuted, cursor:'pointer', fontSize:20 }}>×</button>
          </div>
          {!inviteSent ? (
            <>
              <p style={{ fontSize:13, color:T.textSub, marginBottom:16, lineHeight:1.6 }}>
                Agrega los emails de tus colegas para que también reciban el reporte de inteligencia competitiva.
              </p>
              <label style={{ fontSize:10, fontWeight:700, color:T.textMuted, letterSpacing:'0.1em', display:'block', marginBottom:6 }}>EMAILS (separados por coma, sin espacios)</label>
              <textarea
                value={inviteEmails}
                onChange={e=>setInviteEmails(e.target.value)}
                placeholder="colega1@empresa.com,colega2@empresa.com"
                style={{ width:'100%', background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:10, padding:'10px 14px', color:T.text, fontSize:13, outline:'none', boxSizing:'border-box', resize:'none', height:80, scrollbarWidth:'none' as const }}
              />
              <button
                onClick={async ()=>{
                  if (!inviteEmails.trim()) return
                  try {
                    const { data: { session } } = await supabase.auth.getSession()
                    if (!session) return
                    const emails = inviteEmails.split(',').map((e:string)=>e.trim()).filter(Boolean)
                    const res = await fetch(BACKEND + '/api/onboarding/invite', {
                      method: 'POST',
                      headers: { 'Authorization': 'Bearer ' + session.access_token, 'Content-Type': 'application/json' },
                      body: JSON.stringify({ projectId: dashData?.project?.id, emails })
                    })
                    const data = await res.json()
                    if (data.success) {
                      posthog.capture('colleagues_invited', { count: emails.length })
                      setInviteSent(true)
                    } else alert(data.error || 'Error al enviar invitaciones')
                  } catch(e) { console.error(e) }
                }}
                style={{ width:'100%', marginTop:16, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:800, cursor:'pointer' }}>
                Enviar invitación →
              </button>
            </>
          ) : (
            <div style={{ textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:32, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:15, fontWeight:700, color:'#6EE7A4', marginBottom:8 }}>Invitaciones enviadas</div>
              <div style={{ fontSize:13, color:T.textSub }}>Tus colegas recibirán el próximo reporte automáticamente.</div>
              <button onClick={()=>{setShowInviteModal(false);setInviteSent(false);setInviteEmails('')}} style={{ marginTop:20, background:T.barBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:'10px 24px', color:T.text, fontSize:13, fontWeight:700, cursor:'pointer' }}>Cerrar</button>
            </div>
          )}
        </div>
      </div>
    )}
    {/* Bug #5 — Modal confirmación antes de generar */}
    {showConfirmModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
        <div style={{ background:T.modalBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:32, width:400, maxWidth:'100%' }}>
          <div style={{ textAlign:'center', marginBottom:20 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 16px' }}>⚡</div>
            <div style={{ fontSize:17, fontWeight:900, color:T.text, marginBottom:8 }}>Generar Reporte Ahora</div>
            <div style={{ fontSize:13, color:T.textSub, lineHeight:1.6 }}>
              Se generará un nuevo reporte de inteligencia competitiva para <strong style={{ color:T.text }}>{dashData?.setup?.companyName || 'tu empresa'}</strong>.
            </div>
            <div style={{ marginTop:12, fontSize:11, color:T.textMuted, background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'8px 12px' }}>
              El reporte tardará entre 5 y 10 minutos en generarse. Recibirás una notificación por email cuando esté listo.
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={() => setShowConfirmModal(false)}
              style={{ flex:1, background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:'12px', color:T.textSub, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Cancelar
            </button>
            <button
              onClick={handleGenerateReport}
              style={{ flex:1, background:'linear-gradient(135deg,#6EE7A4,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:900, cursor:'pointer' }}>
              Sí, generar →
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Bug #6 — Modal elegante de límite de frecuencia */}
    {showLimitModal && (
      <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20 }}>
        <div style={{ background:T.modalBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:32, width:400, maxWidth:'100%' }}>
          <div style={{ textAlign:'center', marginBottom:24 }}>
            <div style={{ width:52, height:52, borderRadius:16, background:'rgba(242,192,99,0.1)', border:'1px solid rgba(242,192,99,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 16px' }}>{stuckMinutes >= 10 ? '⚠️' : '🕐'}</div>
            <div style={{ fontSize:17, fontWeight:900, color:T.text, marginBottom:8 }}>{stuckMinutes >= 10 ? 'Reporte cancelado' : 'Reporte en proceso'}</div>
            <div style={{ fontSize:13, color:T.textSub, lineHeight:1.6, marginBottom:12 }}>
              {limitMessage}
            </div>
            {nextReportInfo && (
              <div style={{ fontSize:13, color:'#F2C063', fontWeight:700, background:'rgba(242,192,99,0.08)', border:'1px solid rgba(242,192,99,0.2)', borderRadius:12, padding:'10px 16px' }}>
                {nextReportInfo}
              </div>
            )}
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button
              onClick={() => setShowLimitModal(false)}
              style={{ flex:1, background:T.inputBg, border:`1px solid ${T.border2}`, borderRadius:20, padding:'12px', color:T.textSub, fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Entendido
            </button>
            <button
              onClick={() => { setShowLimitModal(false); router.push('/upgrade') }}
              style={{ flex:1, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'12px', color:'#0D0F1A', fontSize:13, fontWeight:900, cursor:'pointer' }}>
              Ver planes →
            </button>
          </div>
        </div>
      </div>
    )}

    </main>
  )
}
