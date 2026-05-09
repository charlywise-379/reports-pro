'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SuccessPage() {
  const router = useRouter()
  useEffect(() => { setTimeout(() => router.push('/dashboard'), 3000) }, [])
  return (
    <main style={{ minHeight:'100vh', background:'#0D0F1A', color:'#F0F2FF', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>🎉</div>
      <h1 style={{ fontSize:24, fontWeight:900, marginBottom:8 }}>¡Suscripción activada!</h1>
      <p style={{ color:'#9CA3AF', marginBottom:4 }}>Tu período de prueba de 7 días ha comenzado.</p>
      <p style={{ color:'#5A627A', fontSize:12 }}>Redirigiendo al dashboard...</p>
    </main>
  )
}
