'use client'
import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type PollingStatus = 'waiting' | 'active' | 'timeout' | 'error'

function SuccessContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [status, setStatus] = useState<PollingStatus>('waiting')
  const [dots, setDots] = useState('.')
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '.' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId) { router.push('/dashboard'); return }
    let attempts = 0
    const MAX_ATTEMPTS = 15
    let stopped = false
    const poll = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session || stopped) return
        // Verificar directamente contra Stripe (no depende del webhook)
        const verifyRes = await fetch(`${BACKEND}/api/stripe/verify-session/${sessionId}`, {
          headers: { 'Authorization': 'Bearer ' + session.access_token }
        })
        const verifyData = await verifyRes.json()
        const isReady = verifyData?.ready === true
        if (isReady) { stopped = true; setStatus('active'); setTimeout(() => router.push('/dashboard'), 1500); return }
        attempts++
        if (attempts >= MAX_ATTEMPTS) { stopped = true; setStatus('timeout'); setTimeout(() => router.push('/dashboard'), 3000); return }
        setTimeout(poll, 2000)
      } catch {
        attempts++
        if (attempts >= MAX_ATTEMPTS) { stopped = true; setStatus('error'); setTimeout(() => router.push('/dashboard'), 3000); return }
        setTimeout(poll, 2000)
      }
    }
    setTimeout(poll, 2000)
    return () => { stopped = true }
  }, [])

  const msg = {
    waiting: { title: 'Activando tu suscripción', sub: `Confirmando pago con Stripe${dots}`, color: '#8B7BFF', icon: '⚡' },
    active:  { title: '¡Suscripción activada!', sub: 'Redirigiendo...', color: '#6EE7A4', icon: '🎉' },
    timeout: { title: 'Casi listo', sub: 'Redirigiendo...', color: '#F2C063', icon: '🕐' },
    error:   { title: 'Pago recibido', sub: 'Redirigiendo...', color: '#F2C063', icon: '✓' },
  }[status]

  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'system-ui,sans-serif', padding:24 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pp{0%{transform:translateX(-100%)}100%{transform:translateX(350%)}}`}</style>
      <div style={{ textAlign:'center', maxWidth:420 }}>
        <div style={{ marginBottom:24, display:'flex', justifyContent:'center' }}>
          {status === 'waiting'
            ? <div style={{ width:56, height:56, border:'3px solid rgba(139,123,255,0.2)', borderTopColor:'#8B7BFF', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
            : <div style={{ width:56, height:56, background:`${msg.color}15`, border:`1px solid ${msg.color}40`, borderRadius:16, display:'flex', alignItems:'center', justifyContent:'center', fontSize:26 }}>{msg.icon}</div>
          }
        </div>
        <h1 style={{ fontSize:22, fontWeight:900, marginBottom:8, color:msg.color }}>{msg.title}</h1>
        <p style={{ color:'#9CA3AF', fontSize:14 }}>{msg.sub}</p>
        {status === 'waiting' && <>
          <div style={{ marginTop:24, height:3, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
            <div style={{ height:'100%', width:'40%', background:'linear-gradient(90deg,#8B7BFF,#5DD4D4)', animation:'pp 1.5s ease-in-out infinite' }} />
          </div>
          <p style={{ marginTop:16, fontSize:11, color:'#5A627A' }}>
            ¿No redirige? <a href="/dashboard" style={{ color:'#8B7BFF', textDecoration:'none' }}>Ir al dashboard →</a>
          </p>
        </>}
      </div>
    </main>
  )
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main style={{ minHeight:'100vh', background:'#0D0F1A', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <div style={{ width:40, height:40, border:'3px solid rgba(139,123,255,0.2)', borderTopColor:'#8B7BFF', borderRadius:'50%', animation:'spin 0.9s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  )
}