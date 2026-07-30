'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Mail, Lock, ArrowRight, Sparkles, CheckCircle } from 'lucide-react'
import posthog from 'posthog-js'

function LoginContent() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  const justConfirmed = searchParams.get('confirmed') === '1'
  const supabase = createClient()

  const handleLogin = async () => {
    setLoading(true)
    setError('')
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email o contraseña incorrectos')
      posthog.capture('login_failed', { email })
      setLoading(false)
    } else {
      posthog.identify(data.user?.id, { email: data.user?.email })
      posthog.capture('user_logged_in', { email: data.user?.email })
      // Verificar si el usuario ya tiene proyecto configurado
      try {
        const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'
        const res = await fetch(`${BACKEND}/api/dashboard/${data.user?.id}`)
        const dashData = await res.json()
        // Ir al dashboard solo si tiene proyecto con nombre real y setup completo
        const hasRealProject = dashData?.project && 
          dashData?.setup?.companyName && 
          dashData.setup.companyName !== 'Sin nombre' &&
          dashData.setup.companyName.trim() !== ''
        if (hasRealProject) {
          router.push('/dashboard')
        } else {
          router.push('/onboarding')
        }
      } catch {
        router.push('/dashboard')
      }
    }
  }

  return (
    <main className="min-h-screen bg-[#060609] text-white flex items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <img src="/logo-full.png" alt="Omni Reports" className="h-9 w-auto" />
          </Link>
          <h1 className="text-2xl font-black mb-2">Bienvenido de vuelta</h1>
          <p className="text-gray-400 text-sm">Ingresa a tu cuenta para ver tus reportes</p>
        </div>

        {/* Card */}
        <div className="bg-white/3 border border-white/8 rounded-3xl p-8 backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-t-3xl" />

          <div className="space-y-4">

            {/* Email */}
            <div>
              <label className="text-sm text-gray-400 font-medium mb-1.5 block">Email</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-sm text-gray-400 font-medium mb-1.5 block">Contraseña</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {justConfirmed && !error && (
              <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
                <CheckCircle size={16} />
                Cuenta confirmada. Inicia sesión para continuar.
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              onClick={handleLogin}
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Iniciar sesión
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Crear cuenta gratis
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-[#060609] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </main>
    }>
      <LoginContent />
    </Suspense>
  )
}
