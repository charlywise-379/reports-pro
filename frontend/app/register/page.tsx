'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, Mail, Lock, User, ArrowRight, CheckCircle, Sparkles } from 'lucide-react'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const supabase = createClient()

  const handleRegister = async () => {
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    })
    if (error) {
      setError(error.message === 'User already registered'
        ? 'Este email ya está registrado. ¿Quieres iniciar sesión?'
        : 'Ocurrió un error. Intenta de nuevo.')
      setLoading(false)
    } else {
      setSuccess(true)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#060609] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-green-500/30">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3">¡Revisa tu email!</h1>
          <p className="text-gray-400 mb-6">
            Te enviamos un link de confirmación a <span className="text-white font-semibold">{email}</span>. Haz clic en el link para activar tu cuenta y comenzar tu prueba de 7 días.
          </p>
          <Link href="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Ir a iniciar sesión
            <ArrowRight size={16} />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060609] text-white flex items-center justify-center px-6">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap size={20} className="text-white" />
            </div>
            <div className="text-left">
              <span className="font-black text-xl">Reports<span className="text-blue-400"> PRO</span></span>
              <div className="text-[10px] text-gray-500 -mt-0.5 tracking-widest uppercase">AI Automated</div>
            </div>
          </Link>

          <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={12} />
            7 días gratis · Sin tarjeta de crédito
          </div>
          <h1 className="text-2xl font-black mb-2">Crea tu cuenta gratis</h1>
          <p className="text-gray-400 text-sm">Tu primer reporte AI en menos de 5 minutos</p>
        </div>

        {/* Card */}
        <div className="relative bg-white/3 border border-white/8 rounded-3xl p-8 backdrop-blur-sm">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent rounded-t-3xl" />

          <div className="space-y-4">

            {/* Nombre */}
            <div>
              <label className="text-sm text-gray-400 font-medium mb-1.5 block">Nombre completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Carlos Mendoza"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-sm text-gray-400 font-medium mb-1.5 block">Email empresarial</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="carlos@empresa.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
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
                  placeholder="Mínimo 6 caracteres"
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 focus:bg-white/8 transition-all"
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            {/* Botón */}
            <button
              onClick={handleRegister}
              disabled={loading || !email || !password || !fullName}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles size={16} />
                  Crear cuenta y comenzar gratis
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-gray-600 text-xs text-center">
              Al registrarte aceptas nuestros{' '}
              <a href="#" className="text-gray-500 hover:text-gray-400 underline">Términos de servicio</a>
              {' '}y{' '}
              <a href="#" className="text-gray-500 hover:text-gray-400 underline">Política de privacidad</a>
            </p>

          </div>

          <div className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">
              Iniciar sesión
            </Link>
          </div>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-600">
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-green-500" />
            Sin tarjeta requerida
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-green-500" />
            7 días gratis
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-green-500" />
            Cancela cuando quieras
          </div>
        </div>

      </div>
    </main>
  )
}
cat > ~/Documents/reports-pro/frontend/app/dashboard/page.tsx << 'EOF'
'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, Brain, BarChart2, HeartPulse, ShieldAlert,
  Plus, Clock, CheckCircle, AlertCircle, LogOut,
  Sparkles, ChevronRight, Bell
} from 'lucide-react'

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
      } else {
        setUser(user)
        setLoading(false)
      }
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#060609] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-400">
          <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          Cargando tu dashboard...
        </div>
      </main>
    )
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] || 'ahí'

  return (
    <main className="min-h-screen bg-[#060609] text-white">

      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#060609]/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap size={16} className="text-white" />
            </div>
            <span className="font-black text-lg">Reports<span className="text-blue-400"> PRO</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors relative">
              <Bell size={16} className="text-gray-400" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full" />
            </button>
            <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center text-xs font-black">
                {firstName[0]?.toUpperCase()}
              </div>
              <span className="text-sm text-gray-300 hidden md:block">{user?.email}</span>
            </div>
            <button
              onClick={handleLogout}
              className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center hover:bg-red-500/10 hover:border-red-500/20 transition-colors"
            >
              <LogOut size={15} className="text-gray-400" />
            </button>
          </div>
        </div>
      </nav>

      <div className="relative max-w-7xl mx-auto px-6 py-10">

        {/* BIENVENIDA */}
        <div className="mb-10">
          <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">
            <Brain size={12} /> Dashboard AI
          </div>
          <h1 className="text-3xl font-black mb-1">
            Bienvenido, <span className="text-blue-400">{firstName}</span> 👋
          </h1>
          <p className="text-gray-400">Gestiona tus módulos de inteligencia AI desde aquí.</p>
        </div>

        {/* TRIAL BANNER */}
        <div className="bg-gradient-to-r from-blue-950/80 via-violet-950/80 to-blue-950/80 border border-blue-500/25 rounded-2xl p-5 mb-8 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-violet-600 rounded-xl flex items-center justify-center shrink-0">
              <Sparkles size={18} className="text-white" />
            </div>
            <div>
              <div className="font-bold text-sm">Tu prueba gratuita está activa</div>
              <div className="text-gray-400 text-xs">7 días para explorar todos los módulos AI sin costo</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/20 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              7 días restantes
            </div>
            <Link href="/onboarding" className="bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold px-4 py-2 rounded-xl hover:scale-105 transition-transform flex items-center gap-1.5">
              Activar módulo
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Módulos activos', value: '0', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { label: 'Reportes generados', value: '0', icon: Sparkles, color: 'text-violet-400', bg: 'bg-violet-500/10' },
            { label: 'Días de prueba', value: '7', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
            { label: 'Alertas activas', value: '0', icon: AlertCircle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                <stat.icon size={16} className={stat.color} />
              </div>
              <div className={`text-2xl font-black ${stat.color} mb-0.5`}>{stat.value}</div>
              <div className="text-gray-500 text-xs">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* MÓDULOS */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-black">Tus módulos AI</h2>
          <Link href="/onboarding" className="flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-semibold transition-colors">
            <Plus size={16} />
            Agregar módulo
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-10">

          {/* Módulo 1 */}
          <div className="group relative bg-gradient-to-b from-[#0a1628] to-[#060609] border border-blue-500/20 rounded-2xl p-6 hover:border-blue-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-blue-400 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                <BarChart2 size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600 border border-white/8 px-2.5 py-1 rounded-full">No activado</span>
            </div>
            <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-1">Módulo 01</div>
            <h3 className="font-black mb-2">Inteligencia Competitiva</h3>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">Monitoreo AI de competidores, precios y regulaciones de tu sector.</p>
            <Link href="/onboarding?module=competitive" className="w-full flex items-center justify-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 text-sm font-semibold py-2.5 rounded-xl transition-all">
              <Plus size={14} />
              Activar módulo
            </Link>
          </div>

          {/* Módulo 2 */}
          <div className="group relative bg-gradient-to-b from-[#0a1f12] to-[#060609] border border-green-500/20 rounded-2xl p-6 hover:border-green-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-green-600 to-emerald-400 rounded-xl flex items-center justify-center shadow-lg shadow-green-500/20">
                <HeartPulse size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600 border border-white/8 px-2.5 py-1 rounded-full">No activado</span>
            </div>
            <div className="text-green-400 text-xs font-bold uppercase tracking-widest mb-1">Módulo 02</div>
            <h3 className="font-black mb-2">Salud Corporativa RRHH</h3>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">Benchmarks de bienestar y estrategias anti-burnout para tu equipo.</p>
            <Link href="/onboarding?module=hr" className="w-full flex items-center justify-center gap-2 bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-sm font-semibold py-2.5 rounded-xl transition-all">
              <Plus size={14} />
              Activar módulo
            </Link>
          </div>

          {/* Módulo 3 */}
          <div className="group relative bg-gradient-to-b from-[#110a28] to-[#060609] border border-violet-500/20 rounded-2xl p-6 hover:border-violet-500/40 transition-all">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent rounded-t-2xl" />
            <div className="flex items-center justify-between mb-4">
              <div className="w-11 h-11 bg-gradient-to-br from-violet-600 to-purple-400 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20">
                <ShieldAlert size={20} className="text-white" />
              </div>
              <span className="text-xs text-gray-600 border border-white/8 px-2.5 py-1 rounded-full">No activado</span>
            </div>
            <div className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-1">Módulo 03</div>
            <h3 className="font-black mb-2">Radar Ciberseguridad</h3>
            <p className="text-gray-500 text-xs mb-4 leading-relaxed">Vulnerabilidades CVE, alertas de brechas y checklist de protección.</p>
            <Link href="/onboarding?module=security" className="w-full flex items-center justify-center gap-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-400 text-sm font-semibold py-2.5 rounded-xl transition-all">
              <Plus size={14} />
              Activar módulo
            </Link>
          </div>

        </div>

        {/* ACTIVIDAD RECIENTE */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <h3 className="font-black mb-4 flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            Actividad reciente
          </h3>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 bg-white/3 border border-white/8 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-gray-600" />
            </div>
            <p className="text-gray-500 text-sm mb-1">Aún no hay reportes generados</p>
            <p className="text-gray-600 text-xs mb-4">Activa tu primer módulo AI para comenzar</p>
            <Link href="/onboarding" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold px-6 py-2.5 rounded-xl hover:scale-105 transition-transform">
              <Plus size={14} />
              Activar primer módulo
            </Link>
          </div>
        </div>

      </div>
    </main>
  )
}
