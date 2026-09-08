'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowRight, Menu, X, Plus, Minus, Clock, Mail, Phone, User as UserIcon, MessageSquare,
} from 'lucide-react'
import Reveal from './Reveal'

const NAVY = '#191462'
const CREAM = '#F7F5F2'
const PURPLE = '#AC97F7'

const newake = { fontFamily: 'Newake, sans-serif' }

const testimonials = [
  {
    quote: 'Antes tardábamos 3 días en armar un análisis competitivo. Ahora llega solo cada lunes a las 7am. Es como tener un analista senior trabajando 24/7 solo para nosotros.',
    name: 'Carlos Mendoza',
    role: 'Director Comercial',
    company: 'Grupo Alfa',
  },
  {
    quote: 'El reporte de ciberseguridad nos alertó de una vulnerabilidad crítica en nuestro CMS antes de que fuera explotada. Literalmente nos salvó de un ataque que habría costado millones.',
    name: 'Fernanda Ruiz',
    role: 'CISO',
    company: 'Banregio',
  },
  {
    quote: 'Nuestro índice de rotación bajó 23% en 6 meses. Las mecánicas motivacionales del reporte de RH transformaron cómo gestionamos el bienestar de nuestros 1,200 colaboradores.',
    name: 'Alejandro Torres',
    role: 'VP de Recursos Humanos',
    company: 'COPPEL',
  },
  {
    quote: 'Information is power. Con Omni Reports siempre llegamos a la mesa de negociación con datos que nuestros competidores simplemente no tienen. Es ventaja competitiva real.',
    name: 'Marcela Vega',
    role: 'CEO',
    company: 'Vitro Flex',
  },
  {
    quote: 'El ROI fue inmediato. El primer reporte identificó que un competidor estaba bajando precios en nuestro segmento. Actuamos en 48 horas y retuvimos 3 cuentas clave.',
    name: 'Roberto Leal',
    role: 'Director de Estrategia',
    company: 'ARCA Continental',
  },
]

const faqs = [
  {
    q: '1 - ¿Qué es Omni Reports y cómo funciona?',
    a: 'Es una plataforma de inteligencia competitiva que usa IA (motor Claude Sonnet) para escanear webs, redes, medios y fuentes regulatorias de tu industria. Genera reportes ejecutivos automatizados que llegan a tu email o WhatsApp, sin que tu equipo tenga que armarlos manualmente.',
  },
  { q: '2 - ¿Necesito tarjeta de crédito para empezar?', a: 'No. Tu primer reporte es completamente gratis y sin tarjeta. Solo la necesitas si decides continuar después de ver el resultado.' },
  { q: '3 - ¿Qué módulos de inteligencia ofrecen?', a: 'Inteligencia Competitiva Sectorial está disponible hoy. Radar de Ciberseguridad, Salud Corporativa para RRHH y Perfil Clave Ejecutivo llegan próximamente.' },
  { q: '4 - ¿Cuánto cuesta el servicio?', a: 'Desde $49 USD/mes según la frecuencia que elijas: mensual, quincenal, semanal o diario. Todos los planes incluyen el mismo nivel de profundidad de análisis.' },
  { q: '5 - ¿Cuánto tarda en llegar mi primer reporte?', a: 'Minutos. En cuanto configuras tu empresa y tus competidores, el motor empieza a escanear y tu primer reporte llega a tu correo antes de que termines tu café.' },
  { q: '6 -  ¿En qué formato recibo los reportes?', a: 'En PDF ejecutivo, listo para leer o compartir, entregado por email y opcionalmente por WhatsApp.' },
  { q: '7 - ¿Puedo compartir los reportes?', a: 'Sí, sin costo adicional — compártelos con tu equipo o tu junta directiva las veces que quieras.' },
  { q: '8 - ¿cuánto  puedo monitorear?', a: 'Hasta 10 competidores simultáneamente por proyecto, monitoreados 24/7 sin que se te escape nada.' },
]

const modules = [
  {
    n: '01', title: 'Inteligencia Competitiva Sectorial', color: '#51A2FF', shadow: 'rgba(81,162,255,0.45)',
    body: 'Sabe exactamente qué está haciendo tu competencia — antes de que llegue a tus clientes.\n\nOmnireports escanea automáticamente sitios, directorios, redes sociales, sitios de reclutamiento, bolsas de trabajo, medios, bases de patentes y fuentes regulatorias.\n\nLlega en minutos.',
    ideal: 'Directores comerciales · marketing · estrategia · Fundadores',
    active: true,
  },
  {
    n: '02', title: 'Radar de Ciberseguridad Empresarial', color: '#05DF72', shadow: 'rgba(5,223,114,0.45)',
    body: 'Tu empresa tiene vulnerabilidades que no sabes que existen. Este módulo las detecta antes de que alguien las explote.\n\nMonitoreo continuo de CVEs, brechas en tu sector y postura de seguridad de tu dominio. Tu equipo de seguridad disponible 24/7, sin el costo de uno.',
    ideal: 'CISOs · CTOs · Equipos de tecnología',
    active: false,
  },
  {
    n: '03', title: 'Salud Corporativa para RRHH', color: '#A684FF', shadow: 'rgba(166,132,255,0.45)',
    body: 'Retén talento antes de perderlo. Detecta señales de burnout, rotación y clima laboral antes de que se conviertan en un problema.\n\nIA especializada en psicología organizacional y bienestar laboral. Analiza tendencias globales y las adapta a tu empresa, industria y cultura de trabajo específica.',
    ideal: 'Directores de RRHH · Gerentes de Personas · CEO',
    active: false,
  },
  {
    n: '04', title: 'Perfil Clave Ejecutivo', color: '#FFB900', shadow: 'rgba(255,185,0,0.45)',
    body: 'Entra a cada negociación sabiendo más que tu contraparte.\n\nConstruimos un perfil 360° de cualquier ejecutivo: estilo de liderazgo, red de contactos, historial de decisiones y palancas de influencia para negociación estratégica.',
    ideal: 'CEOs · Directores Comerciales · M&A · Equipos de ventas enterprise',
    active: false,
  },
]

const plans = [
  { freq: 'Mensual', price: 49, desc: '1 reporte al mes', featured: true },
  { freq: 'Quincenal', price: 79, desc: 'Cada 15 días', featured: false },
  { freq: 'Semanal', price: 99, desc: 'Cada semana', featured: false },
  { freq: 'Diario', price: 149, desc: 'Cada día hábil', featured: false },
]

function CTAButton({ href, children, variant = 'solid' }: { href: string; children: React.ReactNode; variant?: 'solid' | 'ghost' }) {
  const base = 'inline-flex items-center gap-2.5 rounded-full px-6 py-3.5 text-sm font-medium transition-all hover:scale-[1.03] active:scale-[0.98] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)]'
  const solid = 'text-white'
  return (
    <Link
      href={href}
      className={`${base} ${variant === 'solid' ? solid : 'bg-white border'}`}
      style={variant === 'solid' ? { background: PURPLE, color: CREAM } : { borderColor: PURPLE, color: NAVY }}
    >
      {children}
      <ArrowRight size={16} />
    </Link>
  )
}

export default function Landing2Page() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState<number>(0)
  const [activeTestimonial, setActiveTestimonial] = useState(0)
  const [anual, setAnual] = useState(false)

  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [contactSubject, setContactSubject] = useState('')
  const [contactMessage, setContactMessage] = useState('')
  const [contactLoading, setContactLoading] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [contactError, setContactError] = useState('')

  const prevTestimonial = () => setActiveTestimonial(i => (i - 1 + testimonials.length) % testimonials.length)
  const nextTestimonial = () => setActiveTestimonial(i => (i + 1) % testimonials.length)
  const t = testimonials[activeTestimonial]

  const handleContactSubmit = async () => {
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim() || contactLoading) return
    setContactLoading(true)
    setContactError('')
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'
      const res = await fetch(`${BACKEND}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: contactName,
          email: contactEmail,
          message: `${contactSubject ? `Asunto: ${contactSubject}\n` : ''}${contactPhone ? `Teléfono: ${contactPhone}\n\n` : ''}${contactMessage}`,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setContactError(data.error || 'Ocurrió un error. Intenta de nuevo.')
        return
      }
      setContactSent(true)
    } catch {
      setContactError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setContactLoading(false)
    }
  }

  const navLinks = [
    { label: 'Inicio', href: '#inicio' },
    { label: 'Servicios', href: '#servicios' },
    { label: 'Precios', href: '#precios' },
    { label: 'Casos de éxito', href: '#casos' },
  ]

  return (
    <main style={{ background: CREAM, color: NAVY }} className="min-h-screen overflow-x-hidden">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header id="inicio" className="sticky top-0 z-50" style={{ background: CREAM }}>
        <div className="hidden md:flex items-center justify-end gap-4 px-10 lg:px-[200px] py-2.5 border-b border-black/5">
          <a href="https://instagram.com" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
            <Image src="/landing-2/icon-instagram.png" alt="Instagram" width={22} height={22} />
          </a>
          <a href="https://facebook.com" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
            <Image src="/landing-2/icon-facebook.png" alt="Facebook" width={22} height={22} />
          </a>
        </div>
        <div className="flex items-center justify-between px-6 md:px-10 lg:px-[200px] py-4 md:py-5">
          <Link href="/landing-2" className="flex items-center">
            <Image src="/landing-2/logo-full-dark.png" alt="Omni Reports" width={165} height={35} className="h-8 md:h-9 w-auto" priority />
          </Link>
          <nav className="hidden lg:flex items-center gap-8" style={newake}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="text-sm hover:opacity-60 transition-opacity" style={{ color: NAVY }}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-5 py-2.5 text-sm font-medium shadow-[0_8px_20px_-8px_rgba(0,0,0,0.2)] transition-transform hover:scale-105"
              style={{ background: PURPLE, color: NAVY }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-full px-5 py-2.5 text-sm font-medium shadow-[0_8px_20px_-8px_rgba(0,0,0,0.2)] transition-transform hover:scale-105"
              style={{ background: CREAM, color: NAVY, boxShadow: '0 0 0 1px rgba(25,20,98,0.12)' }}
            >
              Prueba Gratis 7 días
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(o => !o)} aria-label="Menú">
            {mobileOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-6 pb-6 flex flex-col gap-4 border-t border-black/5" style={newake}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-sm">{l.label}</a>
            ))}
            <Link href="/login" className="rounded-full px-5 py-3 text-sm font-medium text-center" style={{ background: PURPLE, color: NAVY }}>Iniciar sesión</Link>
            <Link href="/register" className="rounded-full px-5 py-3 text-sm font-medium text-center border" style={{ borderColor: NAVY }}>Prueba Gratis 7 días</Link>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative px-6 pt-14 md:pt-16 pb-32 md:pb-40 text-center overflow-hidden">
        <div className="pointer-events-none absolute -top-24 -right-40 w-[500px] h-[400px] opacity-40">
          <Image src="/landing-2/bg-hexa.png" alt="" fill className="object-contain animate-[spin_60s_linear_infinite]" />
        </div>
        <div className="pointer-events-none absolute -top-10 -left-40 w-[500px] h-[400px] opacity-40 scale-x-[-1]">
          <Image src="/landing-2/bg-hexa.png" alt="" fill className="object-contain animate-[spin_60s_linear_infinite]" />
        </div>

        <Reveal className="relative max-w-4xl mx-auto">
          <p className="text-sm md:text-base font-medium mb-5 opacity-80">
            Inteligencia de Mercados&nbsp;&nbsp;|&nbsp;&nbsp;Automatización AI&nbsp;&nbsp;|&nbsp;&nbsp;Reportes en tiempo real
          </p>
          <h1 className="text-[2.6rem] leading-[1.05] md:text-6xl lg:text-[5.6rem] lg:leading-[0.95] mb-7 text-balance" style={newake}>
            Inteligencia competitiva que tu empresa necesita.
          </h1>
          <p className="text-base md:text-xl leading-relaxed max-w-2xl mx-auto mb-9 opacity-90">
            Analiza automáticamente a tus competidores — precios, contrataciones, campañas, patentes y más.
            <br className="hidden md:block" />
            En español. Sin analistas. Sin dashboards. En tu inbox diario, semanal o mensual.
          </p>
          <div className="flex justify-center mb-6">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 rounded-full px-8 py-4 text-sm md:text-base font-semibold uppercase tracking-wide transition-transform hover:scale-105 shadow-[0_16px_40px_-12px_rgba(172,151,247,0.6)]"
              style={{ background: PURPLE, color: CREAM }}
            >
              Generar mi primer reporte gratis
              <ArrowRight size={18} />
            </Link>
          </div>
          <p className="text-sm opacity-70">Tu primer reporte llega en minutos · Cancela cuando quieras</p>
        </Reveal>

        <Reveal delay={150} className="relative mt-16 md:mt-24 max-w-6xl mx-auto h-[280px] sm:h-[380px] md:h-[520px]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[62%] sm:w-[56%] md:w-[46%] aspect-[870/660] rounded-3xl overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.25)] z-20">
            <Image src="/landing-2/reporte-01.png" alt="Reporte de inteligencia competitiva Omni Reports" fill className="object-cover" />
          </div>
          <div className="absolute left-[2%] sm:left-[6%] top-[18%] w-[42%] sm:w-[36%] md:w-[30%] aspect-[720/546] rounded-3xl overflow-hidden shadow-[0_25px_50px_-15px_rgba(0,0,0,0.2)] z-10 hidden sm:block -rotate-3">
            <Image src="/landing-2/reporte-02.png" alt="Dashboard Omni Reports" fill className="object-cover" />
          </div>
          <div className="absolute right-[2%] sm:right-[6%] top-[18%] w-[42%] sm:w-[36%] md:w-[30%] aspect-[720/546] rounded-3xl overflow-hidden shadow-[0_25px_50px_-15px_rgba(0,0,0,0.2)] z-10 hidden sm:block rotate-3">
            <Image src="/landing-2/reporte-03.png" alt="Reporte ejecutivo Omni Reports" fill className="object-cover" />
          </div>
        </Reveal>
      </section>

      {/* ── ¿TE HA PASADO? ─────────────────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,340px)_1fr] gap-10 md:gap-16 items-center">
          <Reveal>
            <h2 className="text-3xl md:text-5xl leading-tight text-balance" style={newake}>
              ¿Te ha pasado alguna de estas?
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <div
              className="rounded-[30px] bg-white p-8 md:p-14 text-center shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]"
              style={{ border: `2px solid ${PURPLE}` }}
            >
              <h3 className="text-2xl md:text-4xl mb-4 leading-snug" style={newake}>
                &ldquo;Me enteré en la reunión con el cliente&rdquo;
              </h3>
              <p className="text-base md:text-lg opacity-90 max-w-xl mx-auto">
                Tu competidor lanzó un descuento o un producto nuevo — y lo supiste cuando tu cliente te lo mencionó, no antes. Ya era tarde para reaccionar.
              </p>
              <div
                className="mt-8 mx-auto max-w-lg rounded-tl-none rounded-[24px] px-8 py-6 text-sm md:text-base font-medium"
                style={{ background: PURPLE, color: CREAM }}
              >
                Si te identificaste con alguna de estas, Omnireports fue diseñado exactamente para ti.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA (3 PASOS) ────────────────────────── */}
      <section id="servicios" className="px-6 lg:px-[110px] pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            { n: 'paso 01', title: 'Dinos quién eres', body: 'Crea tu cuenta en 2 minutos. Dinos el nombre de tu empresa, tu industria y quiénes son tus competidores principales. Sin setup complicado.' },
            { n: 'paso 02', title: 'Omnireports hace el trabajo', body: 'Omnireports escanea automáticamente sitios, directorios, redes sociales, sitios de reclutamiento, bolsas de trabajo, medios, bases de patentes y fuentes regulatorias.' },
            { n: 'paso 03', title: 'Recibes el análisis', body: 'El reporte ejecutivo llega a tu email o WhatsApp en el horario que elijas — diario, semanal, quincenal o mensual. En PDF. En español. Listo para leer.' },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 120}>
              <div className="h-full rounded-[30px] bg-white p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]">
                <div className="text-3xl md:text-4xl mb-4" style={newake}>{step.n}</div>
                <h3 className="text-xl md:text-2xl mb-3" style={newake}>{step.title}</h3>
                <p className="text-sm md:text-base opacity-85 leading-relaxed">{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CONSTELACIÓN DE FEATURES ───────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="rounded-[30px] bg-white p-8 md:p-10 max-w-xl">
              <h3 className="text-3xl md:text-4xl mb-4" style={newake}>Hasta 10 competidores monitoreados</h3>
              <p className="text-base md:text-lg opacity-85 mb-8">
                No importa si son 3 o 10. Omnireports los rastrea todos simultáneamente, 24/7, sin que pierdas nada.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105 shadow-[0_10px_25px_-10px_rgba(172,151,247,0.6)]"
                style={{ background: PURPLE }}
              >
                crear cuenta <ArrowRight size={16} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative aspect-square max-w-md mx-auto">
              <div className="absolute inset-0 rounded-full border" style={{ borderColor: PURPLE }} />
              <div className="absolute inset-[15%] rounded-full border" style={{ borderColor: NAVY }} />
              <div className="absolute inset-[30%] rounded-full overflow-hidden animate-[spin_40s_linear_infinite]">
                <Image src="/landing-2/logo-hexagon-mark.png" alt="Omni Reports" fill className="object-contain" />
              </div>
              {[
                '10 competidores vigilados', 'Alertas anticipadas', 'Benchmark competitivo', 'WhatsApp y email',
                'Comparte gratis', 'Resumen ejecutivo', 'Dashboard + PDF', 'Recomendaciones accionables',
              ].map((label, i) => {
                const angle = (i / 8) * 2 * Math.PI - Math.PI / 2
                const radius = 47
                const x = 50 + radius * Math.cos(angle)
                const y = 50 + radius * Math.sin(angle)
                return (
                  <span
                    key={label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-3 py-1.5 text-[11px] md:text-xs font-medium shadow-[0_8px_20px_-8px_rgba(0,0,0,0.25)]"
                    style={{
                      left: `${x}%`, top: `${y}%`,
                      background: i % 2 === 0 ? PURPLE : 'white',
                      color: i % 2 === 0 ? CREAM : NAVY,
                      border: i % 2 === 0 ? 'none' : `1px solid ${NAVY}`,
                    }}
                  >
                    {label}
                  </span>
                )
              })}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── VS ANALISTA HUMANO ─────────────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <Reveal className="max-w-4xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-5xl leading-tight mb-5 text-balance" style={newake}>
            Inteligencia de nivel enterprise. Sin el costo de uno.
          </h2>
          <p className="text-base md:text-lg opacity-85">
            Un analista de inteligencia competitiva senior cuesta entre $2,100 y $4,200 USD al mes. Solo puede monitorear lo que le da tiempo. Se va de vacaciones. Tiene otros proyectos.
          </p>
        </Reveal>
        <div className="max-w-5xl mx-auto relative grid md:grid-cols-2 gap-0">
          <Reveal className="rounded-[30px] md:rounded-r-none bg-[#F0EEFF] p-8 md:p-10 relative">
            <div className="inline-block rounded-full px-5 py-2 text-lg md:text-xl mb-6" style={{ ...newake, background: CREAM, color: NAVY }}>
              98% más barato
            </div>
            <h3 className="text-2xl md:text-3xl mb-5" style={newake}>OMNIREPORTS</h3>
            <ul className="space-y-2.5 text-sm md:text-base mb-8">
              {['Monitorea 24/7 sin interrupciones', 'Reporte listo en menos de 24 horas', 'No tiene vacaciones, nunca falla', 'Cubre web, redes, medios, patentes, regulaciones', 'Análisis consistente, estructurado y accionable', 'Sin contratos, sin sorpresas, cancela cuando quieras'].map(line => (
                <li key={line} className="flex gap-2.5"><span style={{ color: PURPLE }}>✓</span>{line}</li>
              ))}
            </ul>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold" style={{ color: PURPLE, fontFamily: 'var(--font-dm-sans)' }}>desde $49</span>
              <span className="text-lg opacity-75" style={{ fontFamily: 'var(--font-dm-sans)' }}>USD/mes</span>
            </div>
          </Reveal>
          <div className="hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-16 h-16 rounded-full bg-white shadow-lg text-2xl font-bold" style={{ color: PURPLE, fontFamily: 'var(--font-dm-sans)' }}>
            vs
          </div>
          <Reveal delay={150} className="rounded-[30px] md:rounded-l-none bg-white p-8 md:p-10 border-t md:border-t-0 border-black/5">
            <h3 className="text-2xl md:text-3xl mb-5 mt-[3.75rem] md:mt-0" style={newake}>ANALISTA HUMANO</h3>
            <ul className="space-y-2.5 text-sm md:text-base mb-8 opacity-85">
              {['Monitorea solo lo que le da tiempo', 'Entrega el reporte en 3–5 días hábiles', 'No trabaja fines de semana ni vacaciones', 'Cubre 2–3 fuentes de información', 'Análisis subjetivo y variable', 'Costo fijo + prestaciones + curva de aprendizaje'].map(line => (
                <li key={line} className="flex gap-2.5"><span className="opacity-60">✗</span>{line}</li>
              ))}
            </ul>
            <div className="flex items-baseline gap-3">
              <span className="text-3xl md:text-4xl font-bold" style={{ color: PURPLE, fontFamily: 'var(--font-dm-sans)' }}>$2,100–$4,200</span>
              <span className="text-lg opacity-75" style={{ fontFamily: 'var(--font-dm-sans)' }}>USD/mes</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA INTERMEDIO ──────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <Reveal className="max-w-3xl mx-auto rounded-[30px] bg-white text-center p-10 md:p-16 shadow-[0_25px_60px_-20px_rgba(0,0,0,0.18)]">
          <h2 className="text-3xl md:text-5xl leading-tight mb-5 text-balance" style={newake}>
            Genera tu primer reporte en los próximos 5 minutos
          </h2>
          <p className="text-base md:text-lg opacity-85 mb-3">
            Regístrate ahora, configura tu empresa y recibe tu primer reporte de inteligencia AI antes de que termines tu café.
          </p>
          <p className="text-sm md:text-base opacity-70 mb-8">
            Tu primer reporte gratis&nbsp;&nbsp;|&nbsp;&nbsp;Tu eliges la recurrencia&nbsp;&nbsp;|&nbsp;&nbsp;Cancela con un clic
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105 shadow-[0_14px_30px_-10px_rgba(172,151,247,0.6)]"
            style={{ background: PURPLE }}
          >
            quiero unirme <ArrowRight size={16} />
          </Link>
        </Reveal>
      </section>

      {/* ── PRECIOS ─────────────────────────────────────────── */}
      <section id="precios" className="px-6 lg:px-[200px] py-20 md:py-28">
        <Reveal className="max-w-3xl mx-auto text-center mb-12">
          <h2 className="text-3xl md:text-5xl leading-tight mb-5 text-balance" style={newake}>
            Elige con qué frecuencia quieres saber qué hace tu competencia
          </h2>
          <p className="text-base md:text-lg opacity-85">
            Cada plan incluye el mismo nivel de profundidad de análisis. La diferencia es la frecuencia — cuántas veces al mes quieres recibir tu reporte.
          </p>
        </Reveal>

        <Reveal delay={100} className="flex items-center justify-center gap-4 mb-10">
          <span className="text-sm font-semibold" style={{ opacity: anual ? 0.5 : 1 }}>Pago mensual</span>
          <button
            onClick={() => setAnual(a => !a)}
            className="relative w-14 h-7 rounded-full transition-colors"
            style={{ background: anual ? PURPLE : 'rgba(25,20,98,0.15)' }}
            aria-label="Alternar pago anual"
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${anual ? 'left-8' : 'left-1'}`} />
          </button>
          <span className="text-sm font-semibold" style={{ opacity: anual ? 1 : 0.5 }}>Pago anual</span>
          {anual && (
            <div className="rounded-full px-3 py-1 text-xs font-bold animate-pulse" style={{ background: 'rgba(5,223,114,0.15)', color: '#05DF72' }}>
              🎉 Ahorras 20%
            </div>
          )}
        </Reveal>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-10">
          {plans.map((plan, i) => {
            const precioFinal = anual ? +(plan.price * 0.8).toFixed(2) : plan.price
            const precioAnual = +(precioFinal * 12).toFixed(2)
            return (
              <Reveal key={plan.freq} delay={i * 80}>
                <div
                  className="h-full rounded-[30px] p-7 text-left shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] transition-transform hover:-translate-y-1"
                  style={plan.featured ? { background: PURPLE, color: CREAM } : { background: 'white', color: NAVY }}
                >
                  <div className="text-xl md:text-2xl mb-2" style={newake}>{plan.freq}</div>
                  {anual && <div className="text-sm line-through mb-1 opacity-70">${plan.price}/mes</div>}
                  <div className="text-2xl md:text-3xl mb-1" style={newake}>${precioFinal} USD</div>
                  {anual && (
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold mb-2" style={{ background: 'rgba(5,223,114,0.18)', color: '#05DF72' }}>
                      20% OFF
                    </div>
                  )}
                  <p className="text-sm opacity-90 mt-2">
                    Tu primer reporte es gratis. Cancelas en 2 clics. Sin llamadas, sin formularios.
                  </p>
                  <div className="mt-4 pt-4 border-t text-xs opacity-75" style={{ borderColor: plan.featured ? 'rgba(255,255,255,0.25)' : 'rgba(25,20,98,0.1)' }}>
                    {plan.desc}
                    {anual && <div className="mt-1">${precioAnual}/año total</div>}
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
        <Reveal delay={200} className="text-center text-sm opacity-70">
          Sin contratos anuales&nbsp;&nbsp;|&nbsp;&nbsp;Sin costos ocultos&nbsp;&nbsp;|&nbsp;&nbsp;Cancelas cuando quieras con un clic.
        </Reveal>
      </section>

      {/* ── MÓDULOS ─────────────────────────────────────────── */}
      <section id="modulos" className="px-6 lg:px-[200px] pt-20 md:pt-28 pb-6">
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <h2 className="text-3xl md:text-5xl leading-tight mb-5 text-balance" style={newake}>
            Tu analista de inteligencia trabaja mientras duermes
          </h2>
          <p className="text-base md:text-lg opacity-85">
            Elige el módulo que necesitas. Cada sistema está entrenado específicamente para ese tipo de análisis.
          </p>
        </Reveal>
      </section>
      <section className="px-6 lg:px-[110px] pb-24 space-y-8">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-8">
          {modules.map((m, i) => (
            <Reveal key={m.n} delay={i * 100}>
              <div
                className="h-full rounded-[30px] p-8 md:p-10 flex flex-col text-white"
                style={{ background: m.color, boxShadow: `0 25px 55px -20px ${m.shadow}` }}
              >
                <div className="text-5xl md:text-6xl mb-4" style={{ ...newake, color: NAVY }}>{m.n}</div>
                <h3 className="text-2xl md:text-3xl mb-4" style={newake}>{m.title}</h3>
                <p className="text-sm md:text-base leading-relaxed whitespace-pre-line opacity-95 mb-6">{m.body}</p>
                <p className="text-xs md:text-sm font-medium opacity-90 mt-auto mb-4">Ideal para: {m.ideal}</p>
                {m.active ? (
                  <Link
                    href="/register"
                    className="self-start inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold"
                    style={{ background: NAVY, color: CREAM }}
                  >
                    empezar ahora <ArrowRight size={16} />
                  </Link>
                ) : (
                  <div className="self-start inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold" style={{ background: NAVY, color: CREAM }}>
                    próximamente <Clock size={16} />
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1fr_1.4fr] gap-12">
          <Reveal className="lg:sticky lg:top-28 self-start">
            <h2 className="text-3xl md:text-5xl leading-tight mb-5" style={newake}>Preguntas frecuentes</h2>
            <p className="text-base opacity-85 mb-8">
              Resolvemos las dudas más comunes sobre cómo funciona Omnireports, sus módulos y precios. Empieza gratis hoy mismo.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105"
              style={{ background: PURPLE }}
            >
              quiero unirme <ArrowRight size={16} />
            </Link>
          </Reveal>
          <div className="space-y-3">
            {faqs.map((item, i) => {
              const open = openFaq === i
              return (
                <Reveal key={item.q} delay={Math.min(i, 5) * 60}>
                  <div className="rounded-[24px] bg-white shadow-[0_12px_30px_-18px_rgba(0,0,0,0.2)] overflow-hidden">
                    <button
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      className="w-full flex items-center justify-between gap-6 text-left px-6 md:px-8 py-5"
                    >
                      <span className="text-base md:text-lg" style={newake}>{item.q}</span>
                      <span
                        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-transform"
                        style={{ background: CREAM, color: NAVY, transform: open ? 'rotate(45deg)' : 'none' }}
                      >
                        <Plus size={18} />
                      </span>
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-6 md:px-8 pb-6 text-sm md:text-base opacity-85 leading-relaxed">{item.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS + CONTACTO ─────────────────────────── */}
      <section id="casos" className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
          <Reveal>
            <div className="rounded-[30px] bg-white shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] overflow-hidden">
              <div className="px-8 py-8 text-center" style={{ background: PURPLE, color: CREAM }}>
                <p className="text-xl md:text-2xl leading-snug" style={newake}>
                  Lo que dicen quienes ya no esperan a enterarse tarde.
                </p>
              </div>
              <div className="p-8">
                <p className="text-base md:text-lg leading-relaxed mb-6">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-xl md:text-2xl mb-1" style={newake}>{t.name}</div>
                <div className="text-sm opacity-70 mb-6">{t.role} · {t.company}</div>
                <div className="flex items-center gap-3">
                  <button onClick={prevTestimonial} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: CREAM, color: NAVY }} aria-label="Anterior">
                    <ArrowRight size={16} className="rotate-180" />
                  </button>
                  <button onClick={nextTestimonial} className="w-9 h-9 rounded-full flex items-center justify-center transition-colors" style={{ background: PURPLE, color: CREAM }} aria-label="Siguiente">
                    <ArrowRight size={16} />
                  </button>
                  <div className="flex gap-1.5 ml-2">
                    {testimonials.map((_, i) => (
                      <span key={i} className="h-1.5 rounded-full transition-all" style={{ width: i === activeTestimonial ? 20 : 6, background: i === activeTestimonial ? PURPLE : 'rgba(25,20,98,0.2)' }} />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-[30px] bg-white p-8 md:p-10 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)]">
              {contactSent ? (
                <div className="text-center py-10">
                  <h3 className="text-2xl md:text-3xl mb-3" style={newake}>¡Listo!</h3>
                  <p className="opacity-80">Recibimos tu mensaje, te respondemos a la brevedad.</p>
                </div>
              ) : (
                <>
                  <h3 className="text-2xl md:text-3xl mb-6 text-center" style={newake}>¿Alguna duda en tu primer reporte?</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                      <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nombre"
                        className="w-full rounded-full pl-10 pr-4 py-3 text-sm outline-none" style={{ background: CREAM }} />
                    </div>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                      <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Teléfono"
                        className="w-full rounded-full pl-10 pr-4 py-3 text-sm outline-none" style={{ background: CREAM }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                      <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Correo"
                        className="w-full rounded-full pl-10 pr-4 py-3 text-sm outline-none" style={{ background: CREAM }} />
                    </div>
                    <input value={contactSubject} onChange={e => setContactSubject(e.target.value)} placeholder="Asunto"
                      className="w-full rounded-full px-4 py-3 text-sm outline-none" style={{ background: CREAM }} />
                  </div>
                  <div className="relative mb-5">
                    <MessageSquare size={16} className="absolute left-4 top-4 opacity-50" />
                    <textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Mensaje" rows={4}
                      className="w-full rounded-[24px] pl-10 pr-4 py-3 text-sm outline-none resize-none" style={{ background: CREAM }} />
                  </div>
                  {contactError && <p className="text-sm text-red-500 mb-4">{contactError}</p>}
                  <button
                    onClick={handleContactSubmit}
                    disabled={contactLoading || !contactName.trim() || !contactEmail.trim() || !contactMessage.trim()}
                    className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm font-medium text-white transition-transform hover:scale-105 disabled:opacity-50"
                    style={{ background: PURPLE }}
                  >
                    {contactLoading ? 'Enviando...' : 'enviar'} <Mail size={16} />
                  </button>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="px-6 lg:px-[200px] py-16 border-t" style={{ borderColor: 'rgba(25,20,98,0.15)' }}>
        <div className="max-w-7xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <Image src="/landing-2/logo-full-dark.png" alt="Omni Reports" width={200} height={44} className="h-9 w-auto" />
          <nav className="flex flex-col gap-2 text-sm" style={newake}>
            {navLinks.map(l => <a key={l.href} href={l.href} className="hover:opacity-60 transition-opacity">{l.label}</a>)}
          </nav>
          <nav className="flex flex-col gap-2 text-sm" style={newake}>
            <Link href="/legal/aviso-de-privacidad" className="hover:opacity-60 transition-opacity">Aviso de Privacidad</Link>
            <Link href="/legal/terminos-y-condiciones" className="hover:opacity-60 transition-opacity">Términos y condiciones</Link>
          </nav>
          <div className="flex items-center gap-4 sm:justify-end">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <Image src="/landing-2/icon-instagram.png" alt="Instagram" width={26} height={26} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <Image src="/landing-2/icon-facebook.png" alt="Facebook" width={26} height={26} />
            </a>
          </div>
        </div>
      </footer>
      <div className="px-6 lg:px-[200px] py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs opacity-70" style={{ background: CREAM }}>
        <span style={newake}>© 2026 Omni Reports. Todos los derechos reservados.</span>
        <span style={newake}>By Bvro</span>
      </div>
    </main>
  )
}
