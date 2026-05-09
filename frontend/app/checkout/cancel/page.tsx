'use client'
import { useRouter } from 'next/navigation'

export default function CancelPage() {
  const router = useRouter()
  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>😔</div>
      <h1 style={{ fontSize:24, fontWeight:900, marginBottom:8 }}>Pago cancelado</h1>
      <p style={{ color:'#9CA3AF', marginBottom:24 }}>No se realizó ningún cargo. Puedes intentarlo cuando quieras.</p>
      <button onClick={() => router.push('/checkout')} style={{ background:'#8B7BFF', border:'none', borderRadius:20, padding:'12px 28px', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
        Volver a los planes →
      </button>
    </main>
  )
}
