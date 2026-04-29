'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Zap, BarChart2, FileText, Bell, Star, LogOut, Plus, Clock } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    }
    getUser()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#060609] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#060609] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/6 rounded-full blur-3xl" />
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#060609]/80">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-black">Reports<span className="text-blue-400"> PRO</span></span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">{user?.email}</span>
            <button onClick={handleLogout}
              className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm">
              <LogOut size={15} />
              Salir
            </button>
          </div>
        </div>
      </nav>

      <div className="relative max-w-6xl mx-auto px-6 py-10">

        {/* HEADER */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1.5 text-xs text-green-400 font-medium mb-4">
            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            Trial activo — 7 días gratis
          </div>
          <h1 className="text-3xl font-black mb-1">
            Bienvenido a <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Reports PRO</span>
          </h1>
          <p className="text-gray-400">Tu plataforma de inteligencia empresarial con AI</p>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Módulos activos', value: '0', icon: BarChart2, color: 'blue' },
            { label: 'Reportes generados', value: '0', icon: FileText, color: 'violet' },
            { label: 'Días de prueba', value: '7', icon: Clock, color: 'green' },
            { label: 'Alertas', value: '0', icon: Bell, color: 'amber' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-5">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 bg-${stat.color}-500/15 border border-${stat.color}-500/20`}>
                <stat.icon size={17} className={`text-${stat.color}-400`} />
              </div>
              <div className="text-2xl font-black mb-0.5">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* MÓDULOS */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">Módulos disponibles</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                title: 'Inteligencia Competitiva',
                desc: 'Monitoreo de competidores, precios, campañas y lanzamientos en tiempo real.',
                color: 'blue',
                href: '/onboarding',
                available: true,
              },
              {
                title: 'Salud Corporativa',
                desc: 'Análisis de clima laboral, rotación, ausentismo y bienestar del equipo.',
                color: 'violet',
                href: '#',
                available: false,
              },
              {
                title: 'Radar de Ciberseguridad',
                desc: 'Detección de vulnerabilidades, amenazas y alertas de seguridad digital.',
                color: 'red',
                href: '#',
                available: false,
              },
            ].map((mod, i) => (
              <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-6 flex flex-col">
                <div className={`w-10 h-10 rounded-xl bg-${mod.color}-500/15 border border-${mod.color}-500/20 flex items-center justify-center mb-4`}>
                  <BarChart2 size={18} className={`text-${mod.color}-400`} />
                </div>
                <h3 className="font-bold text-sm mb-2">{mod.title}</h3>
                <p className="text-gray-500 text-xs flex-1 mb-4">{mod.desc}</p>
                {mod.available ? (
                  <Link href={mod.href}
                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all hover:shadow-lg hover:scale-105">
                    <Plus size={13} /> Activar módulo
                  </Link>
                ) : (
                  <button disabled
                    className="flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-gray-600 text-xs font-bold py-2.5 px-4 rounded-xl cursor-not-allowed">
                    Próximamente
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ACTIVIDAD */}
        <div className="bg-white/3 border border-white/8 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black">Actividad reciente</h2>
            <Star size={16} className="text-gray-600" />
          </div>
          <div className="text-center py-8">
            <FileText size={32} className="text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aún no hay reportes generados</p>
            <p className="text-gray-600 text-xs mt-1">Activa un módulo para empezar</p>
          </div>
        </div>
      </div>
    </main>
  )
}