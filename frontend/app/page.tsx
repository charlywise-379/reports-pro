'use client'
import Link from 'next/link'
import { useState } from 'react'
import {
  ArrowRight, Zap, Star, TrendingUp, Lock, ChevronLeft, ChevronRight,
  Brain, ShieldAlert, HeartPulse, Cpu, BarChart2, Activity,
  Globe, Clock, CheckCircle, Sparkles, Building2, Users
} from 'lucide-react'
import ContactModal from '../components/ContactModal'

const testimonials = [
  {
    quote: "Antes tardábamos 3 días en armar un análisis competitivo. Ahora llega solo cada lunes a las 7am. Es como tener un analista senior trabajando 24/7 solo para nosotros.",
    name: "Carlos Mendoza",
    role: "Director Comercial",
    company: "Grupo Alfa",
    avatar: "CM",
    color: "from-blue-600 to-blue-400",
    module: "Inteligencia Competitiva",
    moduleColor: "text-blue-400"
  },
  {
    quote: "El reporte de ciberseguridad nos alertó de una vulnerabilidad crítica en nuestro CMS antes de que fuera explotada. Literalmente nos salvó de un ataque que habría costado millones.",
    name: "Fernanda Ruiz",
    role: "CISO",
    company: "Banregio",
    avatar: "FR",
    color: "from-violet-600 to-violet-400",
    module: "Radar Ciberseguridad",
    moduleColor: "text-violet-400"
  },
  {
    quote: "Nuestro índice de rotación bajó 23% en 6 meses. Las mecánicas motivacionales del reporte de RH transformaron cómo gestionamos el bienestar de nuestros 1,200 colaboradores.",
    name: "Alejandro Torres",
    role: "VP de Recursos Humanos",
    company: "COPPEL",
    avatar: "AT",
    color: "from-green-600 to-emerald-400",
    module: "Salud Corporativa RRHH",
    moduleColor: "text-green-400"
  },
  {
    quote: "Information is power. Con Omni Reports siempre llegamos a la mesa de negociación con datos que nuestros competidores simplemente no tienen. Es ventaja competitiva real.",
    name: "Marcela Vega",
    role: "CEO",
    company: "Vitro Flex",
    avatar: "MV",
    color: "from-amber-600 to-amber-400",
    module: "Inteligencia Competitiva",
    moduleColor: "text-blue-400"
  },
  {
    quote: "El ROI fue inmediato. El primer reporte identificó que un competidor estaba bajando precios en nuestro segmento. Actuamos en 48 horas y retuvimos 3 cuentas clave.",
    name: "Roberto Leal",
    role: "Director de Estrategia",
    company: "ARCA Continental",
    avatar: "RL",
    color: "from-cyan-600 to-cyan-400",
    module: "Inteligencia Competitiva",
    moduleColor: "text-blue-400"
  }
]

export default function Home() {
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [anual, setAnual] = useState(false)
  const [contactOpen, setContactOpen] = useState(false)

  const prev = () => setActiveTestimonial(i => (i - 1 + testimonials.length) % testimonials.length)
  const next = () => setActiveTestimonial(i => (i + 1) % testimonials.length)
  const t = testimonials[activeTestimonial]

  return (
    <main className="min-h-screen bg-[#060609] text-white overflow-x-hidden">

      {/* BACKGROUND */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-600/12 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-cyan-500/8 rounded-full blur-3xl" />
        <div className="absolute inset-0" style={{backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.03) 1px, transparent 0)', backgroundSize: '40px 40px'}} />
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#060609]/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src="/logo-full.png" alt="Omni Reports" className="h-9 w-auto" />
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#servicios" className="hover:text-white transition-colors">Servicios</a>
            <a href="#precios" className="hover:text-white transition-colors">Precios</a>
            <a href="#testimonios" className="hover:text-white transition-colors">Casos de éxito</a>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-gray-400 hover:text-white text-sm transition-colors px-4 py-2 hidden md:block">
              Iniciar sesión
            </Link>
            <Link href="/register" className="group bg-gradient-to-r from-blue-600 to-violet-600 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 flex items-center gap-2">
              <Sparkles size={14} />
              Gratis · 7 días
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-6 pt-20 pb-16 text-center">
        <div className="max-w-5xl mx-auto">

          <div className="inline-flex items-center gap-2 border border-blue-500/30 bg-blue-500/8 text-blue-300 text-xs font-semibold px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
            <Cpu size={12} className="animate-pulse" />
            Motor AI · Claude Sonnet · Reportes en tiempo real
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-6 leading-[1.05]">
            Inteligencia de Mercados.<br />
            Automatización AI.<br />
            <span className="bg-gradient-to-r from-blue-400 via-violet-400 to-cyan-300 bg-clip-text text-transparent">
              Tu ventaja competitiva, en piloto automático.
            </span>
          </h1>

          <p className="text-gray-400 text-xl mb-4 max-w-2xl mx-auto leading-relaxed">
            Inteligencia artificial que analiza tu industria, competidores y riesgos — y entrega reportes ejecutivos directo a tu email o WhatsApp, completamente automatizados.
          </p>

          <div className="hidden sm:flex items-center justify-center gap-6 mb-10 text-sm text-gray-500">
            <div className="flex items-center gap-1.5"><Zap size={13} className="text-green-400" /> Activación en segundos</div>
            <div className="flex items-center gap-1.5"><Brain size={13} className="text-blue-400" /> Motor AI avanzado</div>
            <div className="flex items-center gap-1.5"><Clock size={13} className="text-violet-400" /> Primer reporte en minutos</div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
            <Link href="/register" className="group bg-gradient-to-r from-blue-600 to-violet-600 text-white font-black px-10 py-4 rounded-2xl transition-all hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 flex items-center gap-3 text-lg">
              <Sparkles size={18} />
              Generar mi primer reporte gratis
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <p className="text-gray-600 text-sm mb-10">Sin tarjeta de crédito · 7 días gratis · Cancela cuando quieras</p>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-6 flex-wrap">
            <div className="flex -space-x-2">
              {['from-blue-500 to-blue-400','from-violet-500 to-violet-400','from-pink-500 to-pink-400','from-amber-500 to-amber-400','from-green-500 to-green-400'].map((g, i) => (
                <div key={i} className={`w-9 h-9 bg-gradient-to-br ${g} rounded-full border-2 border-[#060609] flex items-center justify-center text-xs font-black`}>
                  {['C','M','A','J','R'][i]}
                </div>
              ))}
            </div>
            <div className="text-sm text-gray-400"><span className="text-white font-bold">+500 directivos</span> reciben sus reportes cada semana</div>
            <div className="flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full">
              {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-amber-400 fill-amber-400" />)}
              <span className="text-amber-400 text-sm font-bold ml-1">4.9</span>
            </div>
          </div>
        </div>

        {/* Dashboard mockup — solo desktop */}
        <div className="hidden md:block max-w-4xl mx-auto mt-16 relative">
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#060609] to-transparent z-10 pointer-events-none" />
          <div className="border border-white/8 rounded-2xl bg-white/3 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/60">
            <div className="bg-white/3 border-b border-white/5 px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-green-500/70" />
              </div>
              <div className="flex-1 bg-white/5 rounded-md h-5 mx-4 flex items-center px-3">
                <span className="text-gray-600 text-xs">app.reportspro.ai · Dashboard</span>
              </div>
              <div className="flex items-center gap-1.5 bg-green-500/15 border border-green-500/20 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-400 text-xs font-medium">AI Activo</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-3 mb-4">
                {[
                  { label: 'Reportes generados', value: '2,847', icon: Brain, color: 'text-blue-400', bg: 'bg-blue-500/10' },
                  { label: 'Empresas activas', value: '312', icon: Building2, color: 'text-violet-400', bg: 'bg-violet-500/10' },
                  { label: 'Alertas críticas', value: '18', icon: ShieldAlert, color: 'text-red-400', bg: 'bg-red-500/10' },
                  { label: 'Horas ahorradas', value: '4,200', icon: Clock, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                ].map(stat => (
                  <div key={stat.label} className="bg-white/3 rounded-xl p-4 border border-white/5">
                    <div className={`w-8 h-8 ${stat.bg} rounded-lg flex items-center justify-center mb-2`}>
                      <stat.icon size={14} className={stat.color} />
                    </div>
                    <div className={`text-xl font-black ${stat.color} mb-0.5`}>{stat.value}</div>
                    <div className="text-gray-600 text-xs">{stat.label}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-2">
                {[
                  { title: 'Inteligencia Competitiva — Sector Retail LATAM', status: 'Entregado · hace 2h', color: 'bg-green-500', badge: 'bg-green-500/15 text-green-400' },
                  { title: 'Radar Ciberseguridad — Vulnerabilidad CVE-2026-1847 detectada', status: 'Alerta activa', color: 'bg-red-500 animate-pulse', badge: 'bg-red-500/15 text-red-400' },
                  { title: 'Salud Corporativa RRHH — Plan bienestar Q1 2026', status: 'Generando con AI...', color: 'bg-blue-500 animate-pulse', badge: 'bg-blue-500/15 text-blue-400' },
                ].map(item => (
                  <div key={item.title} className="flex items-center justify-between bg-white/2 rounded-xl px-4 py-3 border border-white/5 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${item.color} shrink-0`} />
                      <span className="text-sm text-gray-300">{item.title}</span>
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${item.badge}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* AI BANNER */}
      <section className="relative px-6 py-12">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-blue-950/60 via-violet-950/60 to-blue-950/60 border border-blue-500/20 rounded-2xl px-6 py-6 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-violet-600 rounded-xl flex items-center justify-center shrink-0">
                <Brain size={22} className="text-white" />
              </div>
              <div>
                <div className="font-black text-lg">Motor de Inteligencia Artificial avanzado</div>
                <div className="text-gray-400 text-sm">Impulsado por Claude Sonnet — el modelo de IA más preciso para análisis empresarial</div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:flex md:items-center md:gap-6 gap-3 text-sm">
              {['Web Search en tiempo real','Análisis semántico profundo','Redacción ejecutiva en español','PDF profesional generado al instante'].map(f => (
                <div key={f} className="flex items-center gap-2 text-gray-300">
                  <CheckCircle size={14} className="text-blue-400 shrink-0" />
                  {f}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Cpu size={12} /> Módulos AI especializados
            </div>
            <h2 className="text-4xl font-black mb-4">Motores de inteligencia para tu empresa</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Cada módulo usa IA especializada entrenada para su dominio. No es un chatbot genérico — es un analista experto automatizado para cada área de tu empresa.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">

            {/* Servicio 1 */}
            <div className="group relative bg-gradient-to-b from-[#0a1628] to-[#060609] border border-blue-500/25 rounded-3xl p-8 hover:border-blue-500/50 transition-all hover:shadow-2xl hover:shadow-blue-500/10 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/60 to-transparent" />
              <div className="absolute top-4 right-4 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-110 transition-transform">
                    <BarChart2 size={26} className="text-white" />
                  </div>
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                    <Globe size={16} className="text-blue-400" />
                  </div>
                  <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center justify-center">
                    <TrendingUp size={16} className="text-blue-400" />
                  </div>
                </div>
                <div className="text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">Módulo 01 · AI Competitivo</div>
                <h3 className="font-black text-xl mb-3">Inteligencia Competitiva Sectorial</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">El AI escanea webs, redes, medios y fuentes regulatorias para darte una fotografía completa de tu mercado. Lo que tu equipo tardaría días en armar, llega en minutos.</p>
                <div className="space-y-2.5 mb-6">
                  {[
                    'Movimientos y estrategias de competidores',
                    'Cambios de precios y nuevas campañas',
                    'Lanzamientos y nuevos productos',
                    'Regulaciones y cambios normativos',
                    'Cobertura en medios y redes sociales',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="w-4 h-4 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle size={10} className="text-blue-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-300">
                  <span className="font-bold">Ideal para:</span> Directores comerciales, marketing y estrategia
                </div>
              </div>
            </div>

            {/* Servicio 2 */}
            <div className="group relative bg-gradient-to-b from-[#0a1f12] to-[#060609] border border-green-500/25 rounded-3xl p-8 hover:border-green-500/50 transition-all hover:shadow-2xl hover:shadow-green-500/10 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-green-500/60 to-transparent" />
              <div className="absolute top-4 right-4 w-32 h-32 bg-green-500/5 rounded-full blur-2xl group-hover:bg-green-500/10 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-green-600 to-emerald-400 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/30 group-hover:scale-110 transition-transform">
                    <HeartPulse size={26} className="text-white" />
                  </div>
                  <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                    <Users size={16} className="text-green-400" />
                  </div>
                  <div className="w-10 h-10 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center justify-center">
                    <Activity size={16} className="text-green-400" />
                  </div>
                </div>
                <div className="text-green-400 text-xs font-bold uppercase tracking-widest mb-2">Módulo 02 · AI de Bienestar</div>
                <h3 className="font-black text-xl mb-3">Salud Corporativa para RRHH</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">IA especializada en psicología organizacional y bienestar laboral. Analiza tendencias globales y las adapta a tu empresa, industria y cultura de trabajo específica.</p>
                <div className="space-y-2.5 mb-6">
                  {[
                    'Benchmarks de bienestar por industria',
                    'Estrategias anti-burnout personalizadas',
                    'Métricas de ausentismo y rotación',
                    'Actividades y mecánicas motivadoras',
                    'Cumplimiento NOM-035 y regulaciones IMSS',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle size={10} className="text-green-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-xs text-green-300">
                  <span className="font-bold">Ideal para:</span> Directores y gerentes de Recursos Humanos
                </div>
              </div>
            </div>

            {/* Servicio 3 */}
            <div className="group relative bg-gradient-to-b from-[#110a28] to-[#060609] border border-violet-500/25 rounded-3xl p-8 hover:border-violet-500/50 transition-all hover:shadow-2xl hover:shadow-violet-500/10 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />
              <div className="absolute top-4 right-4 w-32 h-32 bg-violet-500/5 rounded-full blur-2xl group-hover:bg-violet-500/10 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-violet-600 to-purple-400 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                    <ShieldAlert size={26} className="text-white" />
                  </div>
                  <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center">
                    <Lock size={16} className="text-violet-400" />
                  </div>
                  <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/20 rounded-xl flex items-center justify-center">
                    <Cpu size={16} className="text-violet-400" />
                  </div>
                </div>
                <div className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-2">Módulo 03 · AI de Seguridad</div>
                <h3 className="font-black text-xl mb-3">Radar de Ciberseguridad Empresarial</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">Monitoreo continuo de vulnerabilidades CVE, brechas en el sector y postura de seguridad de tu dominio. El AI actúa como tu equipo de seguridad disponible 24/7.</p>
                <div className="space-y-2.5 mb-6">
                  {[
                    'Vulnerabilidades CVE activas en tu stack',
                    'Alertas de brechas en tu industria',
                    'Checklist de protección personalizado',
                    'Análisis de postura de tu dominio',
                    'Cumplimiento LFPDPPP y PCI DSS',
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="w-4 h-4 bg-violet-500/20 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle size={10} className="text-violet-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 text-xs text-violet-300">
                  <span className="font-bold">Ideal para:</span> CISOs, CTOs y equipos de tecnología
                </div>
              </div>
            </div>

            {/* Módulo 04 */}
            <div className="group relative bg-gradient-to-b from-[#1a0f0a] to-[#060609] border border-amber-500/25 rounded-3xl p-8 hover:border-amber-500/50 transition-all hover:shadow-2xl hover:shadow-amber-500/10 overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
              <div className="absolute top-4 right-4 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-all" />
              <div className="relative">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-600 to-orange-400 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                    <Star size={26} className="text-white" />
                  </div>
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                    <Users size={16} className="text-amber-400" />
                  </div>
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center">
                    <Brain size={16} className="text-amber-400" />
                  </div>
                </div>
                <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-2">Módulo 04 · AI Ejecutivo</div>
                <h3 className="font-black text-xl mb-3">Perfil Clave Ejecutivo</h3>
                <p className="text-gray-400 text-sm mb-6 leading-relaxed">IA que construye un perfil 360° de cualquier ejecutivo: estilo de liderazgo, logros, red de contactos, presencia digital y palancas de influencia para negociación estratégica.</p>
                <div className="space-y-2.5 mb-6">
                  {[
                    "Perfil profesional y trayectoria completa",
                    "Estilo de liderazgo y toma de decisiones",
                    "Red de contactos e influencia sectorial",
                    "Presencia digital y reputación pública",
                    "Palancas clave para negociación efectiva",
                  ].map(item => (
                    <div key={item} className="flex items-center gap-2.5 text-sm text-gray-300">
                      <div className="w-4 h-4 bg-amber-500/20 rounded-full flex items-center justify-center shrink-0">
                        <CheckCircle size={10} className="text-amber-400" />
                      </div>
                      {item}
                    </div>
                  ))}
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-3 text-xs text-amber-300">
                  <span className="font-bold">Ideal para:</span> CEOs, directores comerciales y equipos de M&A
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="relative px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="text-violet-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Sparkles size={12} /> Todo incluido en cada reporte
            </div>
            <h2 className="text-4xl font-black mb-4">Inteligencia Artificial Automatizada</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Cada reporte incluye análisis profundo, alertas automáticas y entrega multicanal. Sin configuración extra.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-6 mb-2">
              <div className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-2xl px-6 py-4">
                <div className="text-center">
                  <div className="text-2xl font-black text-red-400">$2,100 - $4,200</div>
                  <div className="text-xs text-gray-500 mt-0.5">USD/mes · Analista senior</div>
                </div>
                <div className="text-2xl font-black text-gray-600 px-2">VS</div>
                <div className="text-center">
                  <div className="text-2xl font-black text-blue-400">desde $49</div>
                  <div className="text-xs text-gray-500 mt-0.5">USD/mes · Omni Reports</div>
                </div>
              </div>
              <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-6 py-4 text-center">
                <div className="text-xl font-black text-green-400">98% más barato</div>
                <div className="text-xs text-gray-500 mt-0.5">mejor inteligencia, sin el sueldo</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BENEFICIOS */}
      <section className="relative px-6 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: TrendingUp, color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20', title: 'Hasta 10 Competidores', desc: 'Movimientos, precios y campañas de tus rivales detectados al instante.' },
              { icon: Zap, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', title: 'Early Warning Alerts', desc: 'Detectamos cambios críticos en tu sector antes que tu competencia.' },
              { icon: Brain, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20', title: 'Inteligencia Accionable', desc: 'No solo datos — recomendaciones ejecutables listas para implementar.' },
              { icon: BarChart2, color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/20', title: 'Benchmark Competitivo', desc: 'Comparativa detallada de competidores en precio, producto y posición.' },
              { icon: Globe, color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20', title: 'Tendencias del Sector', desc: 'Análisis de industria con movimientos clave y señales tempranas de mercado.' },
              { icon: Activity, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', title: 'Resumen Estratégico', desc: 'Todo lo importante de tu periodo en un PDF ejecutivo de alto impacto.' },
              { icon: Lock, color: 'text-indigo-400', bg: 'bg-indigo-500/10 border-indigo-500/20', title: 'PDF + Dashboard', desc: 'Información a detalle disponible en PDF descargable y dashboard en tiempo real.' },
              { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', title: 'WhatsApp + Email', desc: 'Recibes y compartes tus reportes fácilmente por los canales que ya usas.' },
              { icon: Users, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', title: 'Comparte con Colegas', desc: 'Genera copias de tus reportes para tu equipo en tiempo real sin costo adicional.' },
            ].map(feature => (
              <div key={feature.title} className={`flex items-start gap-4 bg-white/2 border ${feature.bg} rounded-2xl p-5 hover:bg-white/4 transition-all`}>
                <div className={`w-10 h-10 ${feature.bg} rounded-xl flex items-center justify-center shrink-0 border`}>
                  <feature.icon size={18} className={feature.color} />
                </div>
                <div>
                  <div className="font-bold text-sm mb-1">{feature.title}</div>
                  <div className="text-gray-500 text-xs leading-relaxed">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIOS */}
      <section id="testimonios" className="relative px-6 py-20 bg-gradient-to-b from-transparent via-white/2 to-transparent">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <div className="text-amber-400 text-xs font-bold uppercase tracking-widest mb-3 flex items-center justify-center gap-2">
              <Star size={12} className="fill-amber-400" /> Casos de éxito reales
            </div>
            <h2 className="text-4xl font-black mb-4">Lo que dicen los líderes que ya usan Omni Reports</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Directivos de las empresas más importantes de México y LATAM confían en nuestra plataforma AI cada semana.</p>
          </div>

          {/* Carousel */}
          <div className="relative">
            <div className="bg-gradient-to-b from-white/5 to-white/2 border border-white/10 rounded-3xl p-6 md:p-10 min-h-64">
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent rounded-t-3xl" />

              <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 bg-gradient-to-br ${t.color} rounded-2xl flex items-center justify-center text-xl font-black shrink-0 shadow-lg`}>
                  {t.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-amber-400 fill-amber-400" />)}
                    <span className={`text-xs font-bold ml-2 ${t.moduleColor}`}>{t.module}</span>
                  </div>
                  <div className="font-black text-lg">{t.name}</div>
                  <div className="text-gray-400 text-sm">{t.role} · <span className="text-white font-semibold">{t.company}</span></div>
                </div>
              </div>

              <blockquote className="text-xl text-gray-200 leading-relaxed font-medium italic">
                "{t.quote}"
              </blockquote>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between mt-6">
              <div className="flex items-center gap-2">
                {testimonials.map((_, i) => (
                  <button key={i} onClick={() => setActiveTestimonial(i)}
                    className={`transition-all rounded-full ${i === activeTestimonial ? 'w-8 h-2 bg-blue-500' : 'w-2 h-2 bg-white/20 hover:bg-white/40'}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button onClick={prev} className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all hover:border-white/20">
                  <ChevronLeft size={18} />
                </button>
                <button onClick={next} className="w-10 h-10 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl flex items-center justify-center transition-all hover:border-white/20">
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRECIOS */}
      <section id="precios" className="relative px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest mb-3">Precios transparentes</div>
            <h2 className="text-3xl md:text-4xl font-black mb-4">Elige tu frecuencia.<br /><span className="bg-gradient-to-r from-blue-400 to-violet-400 bg-clip-text text-transparent">Tu analista AI te espera.</span></h2>
            <div className="max-w-2xl mx-auto space-y-2 mt-4">
              <p className="text-gray-300 text-lg">Inteligencia de mercado profesional a una fracción del costo de un analista.</p>
              <p className="text-white text-xl md:text-2xl font-black">Cada reporte es un estudio de mercado a profundidad.</p>
              <p className="text-blue-400 text-base font-semibold">El costo es ridículo versus un estudio de mercado profesional.</p>
              <p className="text-gray-400 text-sm">Supera a todos los analistas humanos — sin contratos, sin sorpresas, sin excusas y sin fallas.</p>
            </div>
          </div>
          {/* BLOQUE ROI */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-10">
            <div className="flex items-center gap-4 bg-white/3 border border-white/8 rounded-2xl px-6 py-4">
              <div className="text-center">
                <div className="text-2xl font-black text-red-400">$2,100–$4,200</div>
                <div className="text-xs text-gray-500 mt-0.5">USD/mes · Analista senior</div>
              </div>
              <div className="text-2xl font-black text-gray-600 px-2">VS</div>
              <div className="text-center">
                <div className="text-2xl font-black text-blue-400">desde $49</div>
                <div className="text-xs text-gray-500 mt-0.5">USD/mes · Omni Reports</div>
              </div>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-6 py-4 text-center">
              <div className="text-xl font-black text-green-400">98% más barato</div>
              <div className="text-xs text-gray-500 mt-0.5">mejor inteligencia, sin el sueldo</div>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 mb-12">
            <span className={`text-sm font-semibold transition-colors ${!anual ? "text-white" : "text-gray-500"}`}>Pago mensual</span>
            <button onClick={() => setAnual(a => !a)} className={`relative w-14 h-7 rounded-full transition-colors ${anual ? "bg-blue-600" : "bg-white/15"}`}>
              <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${anual ? "left-8" : "left-1"}`} />
            </button>
            <span className={`text-sm font-semibold transition-colors ${anual ? "text-white" : "text-gray-500"}`}>Pago anual</span>
            {anual && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-400 text-xs font-black px-3 py-1 rounded-full animate-pulse">
                🎉 Ahorras 20%
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
            {[
              { freq: "Mensual", price: 49, desc: "1 reporte al mes", tag: null },
              { freq: "Quincenal", price: 79, desc: "Cada 15 días", tag: null },
              { freq: "Semanal", price: 99, desc: "Cada semana", tag: "Más popular" },
              { freq: "Diario", price: 149, desc: "Cada día hábil", tag: "Max ROI" },
            ].map(plan => {
              const precioFinal = anual ? +(plan.price * 0.8).toFixed(2) : plan.price
              const precioAnual = +(precioFinal * 12).toFixed(2)
              return (
                <div key={plan.freq} className={`relative rounded-2xl p-6 text-center border transition-all hover:scale-105 cursor-pointer ${plan.tag === "Más popular" ? "bg-gradient-to-b from-blue-600/25 to-blue-600/5 border-blue-500/50 shadow-lg shadow-blue-500/10" : "bg-white/3 border-white/8 hover:border-white/20 hover:bg-white/5"}`}>
                  {plan.tag && (
                    <div className={`absolute -top-3 left-1/2 -translate-x-1/2 text-white text-xs font-black px-3 py-1 rounded-full whitespace-nowrap ${plan.tag === "Más popular" ? "bg-gradient-to-r from-blue-600 to-violet-600" : "bg-gradient-to-r from-amber-600 to-orange-600"}`}>
                      {plan.tag}
                    </div>
                  )}
                  <div className="text-gray-400 text-sm mb-2 font-medium">{plan.freq}</div>
                  {anual && <div className="text-gray-600 text-sm line-through mb-0.5">${plan.price}/mes</div>}
                  <div className="text-4xl font-black mb-0.5">${precioFinal}</div>
                  <div className="text-gray-500 text-xs mb-1">/mes por módulo</div>
                  {anual && (
                    <div className="inline-flex items-center gap-1 bg-green-500/15 border border-green-500/20 text-green-400 text-xs font-bold px-2 py-0.5 rounded-full mb-2">
                      20% OFF
                    </div>
                  )}
                  <div className="border-t border-white/5 pt-3 mt-2 space-y-1">
                    <div className="text-gray-500 text-xs">{plan.desc}</div>
                    {anual && <div className="text-gray-600 text-xs">${precioAnual}/año total</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <div className="relative bg-gradient-to-r from-blue-950/80 via-violet-950/80 to-blue-950/80 border border-blue-500/25 rounded-3xl p-8 md:p-12 text-center overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/40 to-transparent" />
            <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/25 text-green-400 text-sm font-bold px-4 py-2 rounded-full mb-6">
              <Zap size={14} />
              Activación gratis · En segundos · Sin tarjeta
            </div>
            <h3 className="text-2xl md:text-4xl font-black mb-4">Genera tu primer reporte<br /><span className="text-blue-400">en los próximos 5 minutos</span></h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto text-lg">Regístrate ahora, configura tu empresa y recibe tu primer reporte de inteligencia AI antes de que termines tu café.</p>
            <Link href="/register" className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-black px-8 py-4 md:px-12 md:py-5 rounded-2xl transition-all hover:shadow-2xl hover:shadow-blue-500/30 hover:scale-105 text-base md:text-xl w-full md:w-auto justify-center">
              <Sparkles size={22} />
              Generar reporte ahora
              <ArrowRight size={22} />
            </Link>
            <div className="flex items-center justify-center gap-8 mt-8 text-sm text-gray-500 flex-wrap">
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-400" /> Tu primer reporte gratis</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-400" /> Sin tarjeta de crédito</div>
              <div className="flex items-center gap-2"><CheckCircle size={14} className="text-green-400" /> Cancela con un clic</div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative border-t border-white/5 px-6 py-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/logo-full.png" alt="Omni Reports" className="h-8 w-auto" />
          </div>
          <p className="text-gray-600 text-sm">© 2026 Omni Reports · Hecho con ❤️ en Monterrey, México 🇲🇽</p>
          <div className="flex items-center gap-6 text-gray-600 text-sm">
            <Link href="/legal/aviso-de-privacidad" className="hover:text-gray-400 transition-colors">Privacidad</Link>
            <Link href="/legal/terminos-y-condiciones" className="hover:text-gray-400 transition-colors">Términos</Link>
            <button onClick={() => setContactOpen(true)} className="hover:text-gray-400 transition-colors">Contacto</button>
          </div>
        </div>
      </footer>

      {contactOpen && <ContactModal onClose={() => setContactOpen(false)} />}

    </main>
  )
}