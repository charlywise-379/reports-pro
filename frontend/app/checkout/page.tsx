'use client'
import React from 'react'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const MXN = 17.50

function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}


const PLANS = [
  { key:'weekly', label:'Semanal', freq:'Cada lunes', priceUSD:25.00, priceAnnualUSD:19.99, annualTotal:239.88, monthlyId:'price_1TUzqgRmWEBJMGXd126CDFtd', annualId:'price_1TUzqkRmWEBJMGXdVJa88pIE', popular:true },
  { key:'monthly', label:'Mensual', freq:'Primer día del mes', priceUSD:20.00, priceAnnualUSD:15.99, annualTotal:191.88, monthlyId:'price_1TUzqiRmWEBJMGXdssJJTmry', annualId:'price_1TUzqmRmWEBJMGXdeUrqvLpc', popular:false },
  { key:'biweekly', label:'Quincenal', freq:'Cada 15 días', priceUSD:22.00, priceAnnualUSD:17.59, annualTotal:211.08, monthlyId:'price_1TUzqhRmWEBJMGXdSqv4IxKQ', annualId:'price_1TUzqlRmWEBJMGXdkIQKXZqq', popular:false },
  { key:'daily', label:'Diario', freq:'Cada día hábil', priceUSD:29.99, priceAnnualUSD:23.99, annualTotal:287.88, monthlyId:'price_1TUzqgRmWEBJMGXdhWXTQFM9', annualId:'price_1TUzqjRmWEBJMGXdvziIFflY', popular:false },
]

export default function CheckoutPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [billing, setBilling] = useState<'monthly'|'annual'>('monthly')
  const [selected, setSelected] = useState('weekly')
  const [loading, setLoading] = useState(false)
  const isMobile = useIsMobile()
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.push('/login')
      setUser(user)
    })
  }, [])

  const handleCheckout = async () => {
    if (!user) return
    setLoading(true)
    const plan = PLANS.find(p => p.key === selected)!
    const priceId = billing === 'annual' ? plan.annualId : plan.monthlyId

    try {
      const res = await fetch(`${BACKEND}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, priceId, billingCycle: billing })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else throw new Error(data.error)
    } catch(e: any) {
      alert('Error: ' + e.message)
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif', display:'flex', flexDirection:'column', alignItems:'center', padding:'40px 20px' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:32 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:16 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:900, color:'#0D0F1A' }}>PR</div>
          <span style={{ fontSize:16, fontWeight:800, color:'#F0F2FF' }}>PRO Reports</span>
        </div>
        <h1 style={{ fontSize:28, fontWeight:900, color:'#F0F2FF', marginBottom:8 }}>
          Tu primer reporte está listo —<br/><span style={{ color:'#8B7BFF' }}>actívalo en 5 minutos</span>
        </h1>
        <p style={{ fontSize:14, color:'#9CA3AF', maxWidth:480, margin:'0 auto', lineHeight:1.6 }}>
          Ingresa tu tarjeta para activar tu <strong style={{ color:'#F0F2FF' }}>Reporte IA · Inteligencia Competitiva</strong>, Gratis.<br/>
          No se hace ningún cargo hoy. Cancela cuando quieras, sin preguntas.
        </p>
        <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:16, flexWrap:'wrap' }}>
          {['✓ Sin cargo hoy','✓ Primer reporte en 5 min','✓ Cancela cuando quieras'].map(b => (
            <span key={b} style={{ fontSize:11, fontWeight:700, color:'#6EE7A4', background:'rgba(110,231,164,0.1)', border:'1px solid rgba(110,231,164,0.2)', borderRadius:20, padding:'4px 12px' }}>{b}</span>
          ))}
        </div>
      </div>

      {/* Toggle mensual/anual */}
      <div style={{ display:'flex', alignItems:'center', gap:4, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:20, padding:4, marginBottom:28 }}>
        {(['monthly','annual'] as const).map(b => (
          <button key={b} onClick={() => setBilling(b)} style={{ padding:'8px 20px', borderRadius:16, border:'none', fontSize:12, fontWeight:700, cursor:'pointer', background: billing===b ? '#8B7BFF' : 'transparent', color: billing===b ? '#fff' : '#9CA3AF', transition:'all 0.2s' }}>
            {b === 'monthly' ? 'Mensual' : 'Anual · 20% OFF'}
          </button>
        ))}
      </div>

      {/* Cards de planes */}
      <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4,1fr)', gap:12, width:'100%', maxWidth:900, marginBottom:28 }}>
        {PLANS.map(plan => {
          const price = billing === 'annual' ? plan.priceAnnualUSD : plan.priceUSD
          const priceMXN = Math.round(price * MXN)
          const isSelected = selected === plan.key
          return (
            <div key={plan.key} onClick={() => setSelected(plan.key)}
              style={{ padding:20, background: isSelected ? 'rgba(139,123,255,0.12)' : 'rgba(255,255,255,0.03)', border:`2px solid ${isSelected ? '#8B7BFF' : 'rgba(255,255,255,0.07)'}`, borderRadius:16, cursor:'pointer', position:'relative', transition:'all 0.2s' }}>
              {plan.popular && <div style={{ position:'absolute', top:-10, left:'50%', transform:'translateX(-50%)', background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', borderRadius:20, padding:'2px 12px', fontSize:9, fontWeight:800, color:'#0D0F1A', whiteSpace:'nowrap' }}>MÁS POPULAR</div>}
              {billing === 'annual' && <div style={{ position:'absolute', top:-10, right:10, background:'#1D9E75', borderRadius:20, padding:'2px 10px', fontSize:9, fontWeight:800, color:'#fff' }}>20% OFF</div>}
              <div style={{ fontSize:13, fontWeight:800, color:'#F0F2FF', marginBottom:4 }}>{plan.label}</div>
              <div style={{ fontSize:10, color:'#5A627A', marginBottom:12 }}>{plan.freq}</div>
              <div style={{ fontSize:26, fontWeight:900, color: isSelected ? '#8B7BFF' : '#F0F2FF' }}>${price.toFixed(2)}</div>
              <div style={{ fontSize:10, color:'#5A627A' }}>USD/mes · ~${priceMXN} MXN</div>
              {billing === 'annual' && <div style={{ fontSize:10, color:'#6EE7A4', marginTop:4 }}>Cobro anual: ${plan.annualTotal} USD</div>}
              {isSelected && <div style={{ marginTop:12, width:20, height:20, borderRadius:'50%', background:'#8B7BFF', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#fff', fontWeight:900 }}>✓</div>}
            </div>
          )
        })}
      </div>

      {/* Botón activar */}
      <button onClick={handleCheckout} disabled={loading}
        style={{ background:'linear-gradient(135deg,#8B7BFF,#5DD4D4)', border:'none', borderRadius:20, padding:'14px 40px', color:'#0D0F1A', fontSize:15, fontWeight:900, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, marginBottom:12 }}>
        {loading ? 'Redirigiendo a Stripe...' : 'Activar gratis por 7 días →'}
      </button>
      <p style={{ fontSize:11, color:'#5A627A' }}>Powered by Stripe · Pago 100% seguro · Tu tarjeta no se cobra hoy</p>
    </main>
  )
}
