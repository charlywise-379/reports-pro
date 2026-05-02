'use client'

import { useState, useEffect } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const router = useRouter()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setSessionReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleReset = async () => {
    setError(null)
    if (!password || !confirmPassword) {
      setError('Por favor llena ambos campos.')
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError('Error al actualizar: ' + error.message)
      setLoading(false)
      return
    }
    setSuccess(true)
    setTimeout(() => router.push('/dashboard'), 3000)
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-white font-semibold text-xl tracking-tight">
            Reports <span className="text-purple-400">PRO</span>
          </span>
        </div>
        <div className="bg-[#111118] border border-white/10 rounded-2xl p-8">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-white text-xl font-medium mb-2">¡Contraseña actualizada!</h2>
              <p className="text-white/50 text-sm">Redirigiendo a tu dashboard...</p>
            </div>
          ) : !sessionReady ? (
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/60 text-sm">Verificando enlace de recuperación...</p>
              <p className="text-white/30 text-xs mt-2">
                Si tarda más de 5 segundos,{' '}
                <a href="/login" className="text-purple-400 hover:underline">vuelve al login</a>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-white text-2xl font-semibold mb-1">Nueva contraseña</h1>
              <p className="text-white/50 text-sm mb-6">Elige una contraseña segura.</p>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 mb-4">
                  <p className="text-red-400 text-sm">{error}</p>
                </div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-white/70 text-sm block mb-1.5">Nueva contraseña</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition"
                  />
                </div>
                <div>
                  <label className="text-white/70 text-sm block mb-1.5">Confirmar contraseña</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repite la contraseña"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-purple-500/50 transition"
                  />
                </div>
                <button
                  onClick={handleReset}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition text-sm"
                >
                  {loading ? 'Actualizando...' : 'Actualizar contraseña'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  )
}