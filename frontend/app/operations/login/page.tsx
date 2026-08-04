'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { adminFetch } from '@/lib/operations/api'

export default function OperationsLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch('/api/operations/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        router.push('/operations')
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al iniciar sesión')
        setLoading(false)
      }
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0F1117', color: '#F0F2FF', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <form onSubmit={handleSubmit} style={{ width: 360, padding: 32, background: '#171923', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 24 }}>Operations</h1>
        {error && <div style={{ background: 'rgba(248,113,113,0.15)', color: '#F87171', padding: '8px 12px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <label style={{ fontSize: 12, color: '#8A93A8', display: 'block', marginBottom: 6 }}>Email</label>
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
          style={{ width: '100%', padding: '10px 12px', marginBottom: 16, background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F2FF' }} />
        <label style={{ fontSize: 12, color: '#8A93A8', display: 'block', marginBottom: 6 }}>Contraseña</label>
        <input type="password" value={password} onChange={e => setPassword(e.target.value)} required
          style={{ width: '100%', padding: '10px 12px', marginBottom: 24, background: '#0F1117', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#F0F2FF' }} />
        <button type="submit" disabled={loading}
          style={{ width: '100%', padding: '12px', background: '#8B7BFF', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  )
}
