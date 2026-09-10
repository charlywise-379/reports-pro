'use client'
import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Mail, Phone, User as UserIcon, MessageSquare } from 'lucide-react'
import Reveal from './Reveal'

const NAVY = '#191462'
const CREAM = '#F7F5F2'
const PURPLE = '#AC97F7'
const WHITE = '#FFFFFF'
const BLACK = '#000000'

// Regla A (Figma textCase=UPPER en el 100% de los nodos Newake): el
// transform va horneado en el estilo base, nunca se omite.
const newake = { fontFamily: 'Newake, sans-serif', textTransform: 'uppercase' as const }
const dmSans = { fontFamily: 'var(--font-dm-sans)' }
// Regla A también aplica a rótulos cortos en DM Sans (botones, badges,
// nav, "Ideal para:", precios) — el copy largo de párrafo se excluye
// explícitamente en cada bloque de texto abajo (sin esta clase). Figma
// especifica estos rótulos cortos consistentemente en peso 500 (medium),
// no 400 (regular) como el copy de párrafo.
const dmSansUpper = { fontFamily: 'var(--font-dm-sans)', textTransform: 'uppercase' as const, fontWeight: 500 }

function withAlpha(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  return `rgba(${r},${g},${b},${alpha})`
}

// Path SVG EXACTO exportado de Figma (nodo "Vector 1", el elemento que
// dibuja la unión curva entre la pestaña y el cuerpo en las tarjetas de
// precio y de módulo) — no es un cuarto de círculo, es una curva
// asimétrica tipo "cometa". Orientación canónica: llena la esquina
// inferior-izquierda de su caja 50x50, curva que une un borde vertical
// (izquierda) con uno horizontal (abajo). Se reorienta con `rotate`
// para las otras 3 esquinas.
const NOTCH_PATH = 'M0.0159429 50V45.1127C0.478188 11.1869 11.109 0.281998 47.1078 0.0054245H50C49.0182 -0.00177002 48.0542 -0.00184631 47.1078 0.0054245H0.0159429V45.1127C-0.00556884 46.6915 -0.0050582 48.3202 0.0159429 50Z'

function NotchCurve({ corner, color, size = 30 }: { corner: 'tl' | 'tr' | 'bl' | 'br'; color: string; size?: number }) {
  // canónico (0°) rellena la esquina inferior-izquierda (bl). Rotando en
  // sentido horario 90° por paso: bl→tl→tr→br.
  const rotation = corner === 'bl' ? 0 : corner === 'tl' ? 90 : corner === 'tr' ? 180 : 270
  return (
    <svg
      width={size} height={size} viewBox="0 0 50 50"
      style={{ transform: `rotate(${rotation}deg)` }}
      aria-hidden
    >
      <path d={NOTCH_PATH} fill={color} />
    </svg>
  )
}

// ── Tipografía fluida ────────────────────────────────────────────────
// clamp(min, min + pendiente*vw, max) — interpola linealmente entre el
// tamaño móvil (min) y el tamaño exacto de Figma (max) a lo largo del
// ancho de viewport, sin saltos de breakpoint. Todas usan leading
// unitless (ratio), que escala junto con el tamaño automáticamente.
const T = {
  h1: 'text-[clamp(3.5rem,2.65rem+3.4vw,5.625rem)] leading-[1.1]',
  size50: 'text-[clamp(1.875rem,1.375rem+2vw,3.125rem)] leading-[1.1]',
  size35: 'text-[clamp(1.375rem,1.05rem+1.3vw,2.188rem)] leading-[1.1]',
  size40: 'text-[clamp(1.625rem,1.275rem+1.4vw,2.5rem)] leading-[1.1]',
  size30: 'text-[clamp(1.25rem,1rem+1vw,1.875rem)] leading-[1.1]',
  size80: 'text-[clamp(3rem,2.2rem+3.2vw,5rem)] leading-[1.1]',
  size36: 'text-[clamp(1.5rem,1.2rem+1.2vw,2.25rem)] leading-[1.1]',
  vs: 'text-[clamp(2.5rem,1.75rem+3vw,4.375rem)] leading-[1.1]',
  usdMes: 'text-[clamp(1.125rem,0.825rem+1.2vw,1.875rem)]',
  nav: 'text-[clamp(1.25rem,1.125rem+0.5vw,1.5625rem)]',
  footerNav: 'text-[clamp(1rem,0.85rem+0.6vw,1.375rem)]',
  copyright: 'text-[clamp(0.875rem,0.725rem+0.6vw,1.25rem)]',
  // tamaños específicos para columnas angostas (tarjetas de precio en
  // grillas de 2-4 columnas): piso mucho más bajo que el resto porque
  // el clamp basado en vw no conoce el ancho del contenedor, solo el
  // del viewport, y una tarjeta a 2 columnas es mucho más angosta que
  // la mitad del viewport una vez restado el padding.
  planLabel: 'text-[clamp(1.1rem,0.85rem+1.2vw,3.125rem)] leading-[1.15]',
}

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

// Regla D (opacidad de relleno 0.2 sobre color base + sombra de color a 0.8):
// colores exactos del nodo de Figma, no tonos planos.
const modules = [
  {
    n: '01', title: 'Inteligencia Competitiva Sectorial', color: '#51A2FF',
    body: 'Sabe exactamente qué está haciendo tu competencia — antes de que llegue a tus clientes.\n\nOmnireports escanea automáticamente sitios, directorios, redes sociales, sitios de reclutamiento, bolsas de trabajo, medios, bases de patentes y fuentes regulatorias.\n\nLlega en minutos.',
    bullets: [
      'Movimientos y estrategias de tus competidores principales',
      'Cambios de precios y nuevas campañas activas',
      'Lanzamientos de productos y nuevas funcionalidades',
      'Regulaciones y cambios normativos que afectan tu sector',
      'Cobertura en medios y menciones en redes sociales',
    ],
    idealLabel: 'Ideal para:', ideal: 'Directores comerciales | marketing | estrategia | Fundadores',
    textColor: NAVY, cornerClass: 'rounded-tr-none', active: true,
  },
  {
    n: '02', title: 'Radar de Ciberseguridad Empresarial', color: '#05DF72',
    body: 'Tu empresa tiene vulnerabilidades que no sabes que existen. Este módulo las detecta antes de que alguien las explote.\n\nMonitoreo continuo de CVEs, brechas en tu sector y postura de seguridad de tu dominio. Tu equipo de seguridad disponible 24/7, sin el costo de uno.',
    idealLabel: 'Ideal para:', ideal: 'CISOs | CTOs | Equipos de tecnología',
    textColor: BLACK, cornerClass: 'rounded-bl-none', active: false,
  },
  {
    n: '03', title: 'Salud Corporativa para RRHH', color: '#A684FF',
    body: 'Retén talento antes de perderlo. Detecta señales de burnout, rotación y clima laboral antes de que se conviertan en un problema.\n\nIA especializada en psicología organizacional y bienestar laboral. Analiza tendencias globales y las adapta a tu empresa, industria y cultura de trabajo específica.',
    idealLabel: 'Ideal para:', ideal: 'Directores de RRHH | Gerentes de Personas | CEO',
    textColor: NAVY, cornerClass: 'rounded-tr-none', active: false,
  },
  {
    n: '04', title: 'Perfil Clave Ejecutivo', color: '#FFB900',
    body: 'Entra a cada negociación sabiendo más que tu contraparte.\n\nConstruimos un perfil 360° de cualquier ejecutivo: estilo de liderazgo, red de contactos, historial de decisiones y palancas de influencia para negociación estratégica.',
    idealLabel: 'Ideal para:', ideal: 'CEOs | Directores Comerciales | M&A | Equipos de ventas enterprise',
    textColor: BLACK, cornerClass: 'rounded-bl-none', active: false,
  },
]

const plans = [
  { freq: 'mensual', price: 49, desc: 'Tu primer reporte es gratis.  Cancelas en 2 clics.\nSin llamadas, sin formularios.', badge: '1 reporte al mes', featured: true },
  { freq: 'Quincenal', price: 79, desc: 'Tu primer reporte es gratis.  \nCancelas en 2 clics.\nSin llamadas, sin formularios.', badge: 'Cada 15 días', featured: false },
  { freq: 'Semanal', price: 99, desc: 'Tu primer reporte es gratis.  \nCancelas en 2 clics.\nSin llamadas, sin formularios.', badge: 'Cada semana', featured: false },
  { freq: 'Diario', price: 149, desc: 'Tu primer reporte es gratis.  \nCancelas en 2 clics.\nSin llamadas, sin formularios.', badge: 'Cada día hábil', featured: false },
]

// Regla F (carrusel): botón circular morado con flecha, apuntando en la
// dirección indicada por `dir` (izquierda o derecha), usando el asset real.
// Tamaño también fluido: 44px en móvil hasta los 75x35 exactos de Figma.
function CarouselArrow({ dir, onClick, ariaLabel }: { dir: 'left' | 'right'; onClick?: () => void; ariaLabel: string }) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="w-11 h-11 md:w-[75px] md:h-[35px] rounded-full flex items-center justify-center flex-shrink-0 transition-transform hover:scale-105"
      style={{ background: PURPLE }}
    >
      <Image
        src="/landing-2/icon-carousel-arrow.png"
        alt=""
        width={18}
        height={18}
        style={{ transform: dir === 'right' ? 'rotate(-90deg)' : 'rotate(90deg)' }}
      />
    </button>
  )
}

// Forma "pestaña con muesca cóncava": una etiqueta más angosta que la
// tarjeta, colgando de una esquina, cuya unión con el cuerpo no es un
// escalón recto sino una curva cóncava (radio R) — la silueta exacta que
// aparece en el diseño en las tarjetas de plan, paso, módulo y el badge
// "98% más barato". `corner` indica de qué esquina cuelga la pestaña;
// el cuerpo ocupa el resto de la tarjeta con esa misma esquina recta.
function NotchCard({
  corner, color, radius = 30, tabClassName = '', tabStyle, tab, children, className = '', style, bodyClassName = '', bodyStyle,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br'
  color: string
  radius?: number
  tabClassName?: string
  tabStyle?: CSSProperties
  tab: React.ReactNode
  children: React.ReactNode
  className?: string
  style?: CSSProperties
  bodyClassName?: string
  bodyStyle?: CSSProperties
}) {
  const isTop = corner === 'tl' || corner === 'tr'
  const isLeft = corner === 'tl' || corner === 'bl'

  // Pestaña y cuerpo son dos bloques apilados en una columna flex (no
  // superpuestos): la pestaña, angosta, ajustada a su contenido; el
  // cuerpo, a todo el ancho, con flex-1 para llenar el alto disponible
  // de la fila del grid (fundamental para que no quede un hueco vacío
  // antes de una pestaña que cuelga de una esquina inferior).
  const tabRadius = isTop
    ? (isLeft ? `${radius}px ${radius}px 0 ${radius}px` : `${radius}px ${radius}px ${radius}px 0`)
    : (isLeft ? `${radius}px 0 ${radius}px ${radius}px` : `0 ${radius}px ${radius}px ${radius}px`)

  const bodyRadius = isTop
    ? (isLeft ? `0 ${radius}px ${radius}px ${radius}px` : `${radius}px 0 ${radius}px ${radius}px`)
    : (isLeft ? `${radius}px ${radius}px ${radius}px 0` : `${radius}px ${radius}px 0 ${radius}px`)

  // Parche que dibuja la unión curva entre pestaña y cuerpo: se ancla
  // al borde de la pestaña que da hacia el cuerpo, usando el path SVG
  // exacto exportado de Figma (NotchCurve), no una aproximación.
  const notchPos: CSSProperties = isTop
    ? { top: '100%', [isLeft ? 'left' : 'right']: '100%' }
    : { bottom: '100%', [isLeft ? 'left' : 'right']: '100%' }

  return (
    <div className={`relative flex flex-col ${className}`} style={style}>
      <div
        className={`inline-block relative flex-shrink-0 ${tabClassName}`}
        style={{
          ...tabStyle, background: color, borderRadius: tabRadius,
          order: isTop ? -1 : 1,
          alignSelf: isLeft ? 'flex-start' : 'flex-end',
        }}
      >
        {tab}
        <span aria-hidden className="absolute pointer-events-none" style={{ width: radius, height: radius, ...notchPos }}>
          <NotchCurve corner={corner} color={color} size={radius} />
        </span>
      </div>
      <div className={`flex-1 ${bodyClassName}`} style={{ ...bodyStyle, background: color, borderRadius: bodyRadius, order: 0 }}>
        {children}
      </div>
    </div>
  )
}

// Variante "solo pestaña" para casos donde la muesca no da paso a una
// segunda tarjeta con su propio color (ej. el badge "98% más barato",
// que flota sobre el mismo panel crema, sin cuerpo propio que dibujar).
function NotchTab({
  corner, color, radius = 30, className = '', style, children,
}: {
  corner: 'tl' | 'tr' | 'bl' | 'br'
  color: string
  radius?: number
  className?: string
  style?: CSSProperties
  children: React.ReactNode
}) {
  const isTop = corner === 'tl' || corner === 'tr'
  const isLeft = corner === 'tl' || corner === 'bl'
  const tabRadius = isTop
    ? (isLeft ? `${radius}px ${radius}px 0 ${radius}px` : `${radius}px ${radius}px ${radius}px 0`)
    : (isLeft ? `${radius}px 0 ${radius}px ${radius}px` : `0 ${radius}px ${radius}px ${radius}px`)
  const notchPos: CSSProperties = isTop
    ? { top: '100%', [isLeft ? 'left' : 'right']: '100%' }
    : { bottom: '100%', [isLeft ? 'left' : 'right']: '100%' }
  const gradientAngle = isTop
    ? (isLeft ? 'top left' : 'top right')
    : (isLeft ? 'bottom left' : 'bottom right')

  return (
    <div className={`inline-block relative ${className}`} style={{ ...style, background: color, borderRadius: tabRadius }}>
      {children}
      <span
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          width: radius, height: radius,
          ...notchPos,
          background: `radial-gradient(circle at ${gradientAngle}, transparent ${radius}px, ${color} ${radius}px)`,
        }}
      />
    </div>
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
    <main style={{ background: CREAM, color: BLACK }} className="min-h-screen overflow-x-hidden">
      {/* ── HEADER 2 (barra social) ─────────────────────────── */}
      <div className="hidden md:flex items-center justify-end gap-5 px-6 lg:px-[200px] py-2.5" style={{ background: CREAM }}>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
          <Image src="/landing-2/icon-instagram.png" alt="Instagram" width={20} height={20} />
        </a>
        <a href="https://facebook.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
          <Image src="/landing-2/icon-facebook.png" alt="Facebook" width={20} height={20} />
        </a>
      </div>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header id="inicio" className="sticky top-0 z-50" style={{ background: CREAM }}>
        <div className="flex items-center justify-between px-6 md:px-10 lg:px-[200px] py-4 md:py-5">
          <Link href="/landing-2" className="flex items-center">
            <Image src="/landing-2/logo-full-dark.png" alt="Omni Reports" width={165} height={35} className="h-8 md:h-9 w-auto" priority />
          </Link>
          <nav className={`hidden lg:flex items-center gap-6 xl:gap-8 ${T.nav}`} style={newake}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} className="hover:opacity-60 transition-opacity whitespace-nowrap" style={{ color: BLACK }}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3">
            {/* Regla E: botón de dos líneas explícitas */}
            <Link
              href="/register"
              className="rounded-full px-5 py-2.5 text-sm text-center leading-tight shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] transition-transform hover:scale-105"
              style={{ background: PURPLE, color: NAVY, ...dmSansUpper }}
            >
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="rounded-full px-5 py-2.5 text-sm text-center leading-tight shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] transition-transform hover:scale-105"
              style={{ background: CREAM, color: NAVY, ...dmSansUpper }}
            >
              Prueba Gratis<br />7 días
            </Link>
          </div>
          <button className="md:hidden" onClick={() => setMobileOpen(o => !o)} aria-label="Menú">
            <div className="w-6 h-5 relative flex flex-col justify-between">
              <span className="block h-0.5 w-full" style={{ background: NAVY }} />
              <span className="block h-0.5 w-full" style={{ background: NAVY }} />
              <span className="block h-0.5 w-full" style={{ background: NAVY }} />
            </div>
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-6 pb-6 flex flex-col gap-4 border-t border-black/5" style={newake}>
            {navLinks.map(l => (
              <a key={l.href} href={l.href} onClick={() => setMobileOpen(false)} className="text-base">{l.label}</a>
            ))}
            <Link href="/register" className="rounded-full px-5 py-3 text-sm text-center" style={{ background: PURPLE, color: NAVY, ...dmSansUpper }}>Iniciar sesión</Link>
            <Link href="/register" className="rounded-full px-5 py-3 text-sm text-center border" style={{ borderColor: NAVY, ...dmSansUpper }}>Prueba Gratis 7 días</Link>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative px-6 pt-16 pb-24 md:pb-32 text-center overflow-hidden">
        <div className="pointer-events-none absolute -top-10 -right-20 w-[380px] h-[380px] md:w-[510px] md:h-[510px] opacity-60">
          <Image src="/landing-2/bg-hexa.png" alt="" fill sizes="510px" className="object-contain animate-[spin_90s_linear_infinite]" />
        </div>
        <div className="pointer-events-none absolute -top-10 -left-20 w-[380px] h-[380px] md:w-[510px] md:h-[510px] opacity-60 scale-x-[-1]">
          <Image src="/landing-2/bg-hexa.png" alt="" fill sizes="510px" className="object-contain animate-[spin_90s_linear_infinite]" />
        </div>

        <Reveal className="relative max-w-4xl mx-auto">
          <p className="text-sm sm:text-base mb-4" style={{ color: BLACK, ...dmSansUpper }}>
            Inteligencia de Mercados&nbsp;&nbsp;|&nbsp;&nbsp;Automatización AI&nbsp;&nbsp;|&nbsp;&nbsp;Reportes en tiempo real
          </p>
          <h1 className={`${T.h1} mb-7 text-balance`} style={{ ...newake, color: NAVY }}>
            Inteligencia competitiva que tu empresa necesita.
          </h1>
          <p className="text-base md:text-xl leading-relaxed max-w-2xl mx-auto mb-8" style={{ color: BLACK, ...dmSans }}>
            Analiza automáticamente a tus competidores — precios, contrataciones, campañas, patentes y más.
            <br className="hidden md:block" />
            En español. Sin analistas. Sin dashboards. En tu inbox diario, semanal o mensual.
          </p>
          <div className="flex justify-center mb-6">
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 rounded-full px-6 sm:px-8 py-3.5 sm:py-4 text-xs sm:text-sm md:text-base tracking-wide transition-transform hover:scale-105 shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] text-center"
              style={{ background: PURPLE, color: CREAM, ...dmSansUpper }}
            >
              Generar mi primer reporte gratis
              <Image src="/landing-2/icon-arrow-blue.png" alt="" width={20} height={20} className="flex-shrink-0" />
            </Link>
          </div>
          <p className="text-xs sm:text-sm md:text-base" style={{ color: BLACK, ...dmSansUpper }}>Tu primer reporte llega en minutos · Cancela cuando quieras</p>
        </Reveal>

        {/* Regla G: sin rotación, sangrado casi edge-to-edge del viewport
            (reporte-02 arranca fuera del canvas por la izquierda, reporte-03
            casi toca el borde derecho) */}
        <Reveal delay={150} className="relative left-1/2 -translate-x-1/2 w-screen mt-16 md:mt-20 h-[220px] xs:h-[260px] sm:h-[380px] md:h-[500px]">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[45.3%] aspect-[870/660] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] z-20">
            <Image src="/landing-2/reporte-01.png" alt="Reporte de inteligencia competitiva Omni Reports" fill sizes="45vw" className="object-cover" />
          </div>
          <div className="absolute left-[-6%] top-1/2 -translate-y-1/2 w-[37.5%] aspect-[720/546] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] z-10 hidden sm:block">
            <Image src="/landing-2/reporte-02.png" alt="Dashboard Omni Reports" fill sizes="37vw" className="object-cover" />
          </div>
          <div className="absolute right-[-1.8%] top-1/2 -translate-y-1/2 w-[37.5%] aspect-[720/546] rounded-2xl md:rounded-3xl overflow-hidden shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] z-10 hidden sm:block">
            <Image src="/landing-2/reporte-03.png" alt="Reporte ejecutivo Omni Reports" fill sizes="37vw" className="object-cover" />
          </div>
        </Reveal>
      </section>

      {/* ── ¿TE HA PASADO? (carrusel) ───────────────────────── */}
      <section className="px-6 lg:px-[200px] py-16 md:py-20">
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,340px)_1fr] gap-10 md:gap-16 items-center">
          <Reveal>
            <h2 className={`${T.size50} text-balance`} style={{ ...newake, color: NAVY }}>
              ¿Te ha pasado alguna de estas?
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <div
              className="rounded-[30px] bg-white p-6 sm:p-8 md:p-14 text-center shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]"
              style={{ border: `2px solid ${PURPLE}` }}
            >
              <h3 className={`${T.size40} mb-4`} style={{ ...newake, color: NAVY }}>
                &ldquo;Me enteré en la reunión con el cliente&rdquo;
              </h3>
              <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: NAVY, ...dmSans }}>
                Tu competidor lanzó un descuento o un producto nuevo — y lo supiste cuando tu cliente te lo mencionó, no antes. Ya era tarde para reaccionar.
              </p>
              <div
                className="mt-8 mx-auto max-w-lg rounded-tl-none rounded-[24px] px-6 sm:px-8 py-5 sm:py-6 text-sm md:text-base"
                style={{ background: PURPLE, color: CREAM, ...dmSansUpper }}
              >
                Si te identificaste con alguna de estas, Omnireports fue diseñado exactamente para ti.
              </div>
              {/* controles de carrusel — fila propia debajo del contenido,
                  fuera del flujo absoluto para nunca solaparse con el texto */}
              <div className="flex items-center justify-center gap-4 mt-6">
                <CarouselArrow dir="left" ariaLabel="Anterior" />
                <CarouselArrow dir="right" ariaLabel="Siguiente" />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FUNCIONA SOLO. TÚ SOLO LEES. ───────────────────── */}
      <section className="px-6 text-center pb-10 md:pb-14">
        <Reveal>
          <h2 className={T.size50} style={{ ...newake, color: NAVY }}>
            Funciona solo. <br />Tú solo lees.
          </h2>
        </Reveal>
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
              {/* Regla C: esquina superior-izquierda recta (radii=[0,30,30,30]) */}
              <div className="h-full rounded-[30px] rounded-tl-none p-6 sm:p-8 shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]" style={{ background: CREAM }}>
                <div className={`${T.size50} mb-4`} style={{ ...newake, color: NAVY }}>{step.n}</div>
                <h3 className={`${T.size35} mb-3`} style={{ ...newake, color: NAVY }}>{step.title}</h3>
                <p className="text-sm md:text-base leading-relaxed" style={{ color: NAVY, ...dmSans }}>{step.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CONSTELACIÓN DE FEATURES ───────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="rounded-[30px] bg-white p-6 sm:p-8 md:p-10 max-w-xl">
              <h3 className={`${T.size50} mb-4`} style={{ ...newake, color: NAVY }}>Hasta 10 competidores monitoreados</h3>
              <p className="text-base md:text-lg mb-8" style={{ color: BLACK, ...dmSans, textAlign: 'justify' }}>
                No importa si son 3 o 10. Omnireports los rastrea todos simultáneamente, 24/7, sin que pierdas nada.
              </p>
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm text-white transition-transform hover:scale-105 shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]"
                style={{ background: PURPLE, ...dmSansUpper }}
              >
                crear cuenta <Image src="/landing-2/icon-arrow-blue.png" alt="" width={16} height={16} />
              </Link>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="relative aspect-square max-w-[280px] sm:max-w-md mx-auto">
              <div className="absolute inset-0 rounded-full border" style={{ borderColor: PURPLE }} />
              <div className="absolute inset-[15%] rounded-full border" style={{ borderColor: NAVY }} />
              <div className="absolute inset-[30%] rounded-full overflow-hidden">
                <Image src="/landing-2/logo-hexagon-mark.png" alt="Omni Reports" fill sizes="30vw" className="object-contain" />
              </div>
              {/* Regla G (pills): solo 1 de 8 es morada rellena; el resto son
                  blancas con borde propio (navy o morado según el diseño) */}
              {[
                { label: '10 competidores vigilados', filled: true, border: PURPLE },
                { label: 'Alertas anticipadas', filled: false, border: PURPLE },
                { label: 'Benchmark competitivo', filled: false, border: NAVY },
                { label: 'WhatsApp y email', filled: false, border: NAVY },
                { label: 'Comparte gratis', filled: false, border: PURPLE },
                { label: 'Resumen ejecutivo', filled: false, border: PURPLE },
                { label: 'Dashboard + PDF', filled: false, border: NAVY },
                { label: 'Recomendaciones accionables', filled: false, border: PURPLE },
              ].map((item, i) => {
                const angle = (i / 8) * 2 * Math.PI - Math.PI / 2
                const radius = 47
                const x = 50 + radius * Math.cos(angle)
                const y = 50 + radius * Math.sin(angle)
                return (
                  <span
                    key={item.label}
                    className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[8px] xs:text-[10px] sm:text-xs shadow-[0_0_20px_-8px_rgba(0,0,0,0.15)]"
                    style={{
                      left: `${x}%`, top: `${y}%`,
                      ...dmSansUpper,
                      background: item.filled ? PURPLE : WHITE,
                      color: item.filled ? CREAM : NAVY,
                      border: item.filled ? 'none' : `1px solid ${item.border}`,
                    }}
                  >
                    {item.label}
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
          <h2 className={`${T.size50} leading-[1.3] mb-5 text-balance`} style={{ ...newake, color: NAVY }}>
            Inteligencia de nivel enterprise. <br className="hidden md:block" />Sin el costo de uno.
          </h2>
          <p className="text-base md:text-lg" style={{ color: BLACK, ...dmSans }}>
            Un analista de inteligencia competitiva senior cuesta entre $2,100 y $4,200 USD al mes. Solo puede monitorear lo que le da tiempo. Se va de vacaciones. Tiene otros proyectos.
          </p>
        </Reveal>
        <div className="max-w-[1520px] mx-auto relative grid md:grid-cols-2 gap-0">
          {/* OMNIREPORTS: tarjeta real, crema sobre crema, esquina
              inferior-derecha recta (radii=[30,30,0,30]) */}
          <Reveal className="rounded-[30px] rounded-br-none p-6 sm:p-8 md:p-10 relative" style={{ background: CREAM }}>
            <NotchTab corner="tl" color={CREAM} radius={20} className={`px-4 sm:px-5 py-1.5 sm:py-2 mb-6 ${T.size35}`} style={{ ...newake, color: NAVY }}>
              98% más barato
            </NotchTab>
            <h3 className={`${T.size50} mb-5`} style={{ ...newake, color: NAVY }}>OMNIREPORTS</h3>
            <ul className="space-y-2.5 text-sm md:text-base mb-8" style={{ color: NAVY, ...dmSans }}>
              {['Monitorea 24/7 sin interrupciones', 'Reporte listo en menos de 24 horas', 'No tiene vacaciones, nunca falla', 'Cubre web, redes, medios, patentes, regulaciones', 'Análisis consistente, estructurado y accionable', 'Sin contratos, sin sorpresas, cancela cuando quieras'].map(line => (
                <li key={line} className="flex gap-2.5"><span style={{ color: PURPLE }}>✓</span>{line}</li>
              ))}
            </ul>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className={T.size50} style={{ color: PURPLE, ...dmSansUpper, fontWeight: 700 }}>desde $49</span>
              <span className={T.usdMes} style={{ color: NAVY, ...dmSansUpper }}>USD/mes</span>
            </div>
          </Reveal>
          <div className={`hidden md:flex items-center justify-center absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 ${T.vs}`} style={{ color: PURPLE, ...dmSansUpper, fontWeight: 700 }}>
            vs
          </div>
          {/* ANALISTA HUMANO: sin tarjeta — el nodo de Figma no tiene fill,
              radio ni sombra; es texto plano sobre el fondo de la sección */}
          <Reveal delay={150} className="p-6 sm:p-8 md:p-10">
            <h3 className={`${T.size50} mb-5`} style={{ ...newake, color: NAVY }}>ANALISTA HUMANO</h3>
            <ul className="space-y-2.5 text-sm md:text-base mb-8" style={{ color: BLACK, ...dmSans }}>
              {['Monitorea solo lo que le da tiempo', 'Entrega el reporte en 3–5 días hábiles', 'No trabaja fines de semana ni vacaciones', 'Cubre 2–3 fuentes de información', 'Análisis subjetivo y variable', 'Costo fijo + prestaciones + curva de aprendizaje'].map(line => (
                <li key={line} className="flex gap-2.5"><span>✗</span>{line}</li>
              ))}
            </ul>
            <div className="flex flex-wrap items-baseline gap-3">
              <span className={T.size50} style={{ color: PURPLE, ...dmSansUpper, fontWeight: 700 }}>$2,100–$4,200</span>
              <span className={T.usdMes} style={{ color: BLACK, ...dmSansUpper }}>USD/mes</span>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA INTERMEDIO ──────────────────────────────────── */}
      <section className="px-6 py-20 md:py-28">
        <Reveal className="max-w-[940px] mx-auto rounded-[30px] text-center p-8 sm:p-10 md:p-16 shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]" style={{ background: CREAM }}>
          <h2 className={`${T.size50} mb-5 text-balance`} style={{ ...newake, color: NAVY }}>
            Genera tu primer reporte<br />en los próximos 5 minutos
          </h2>
          <p className="text-base md:text-lg mb-3" style={{ color: BLACK, ...dmSans }}>
            Regístrate ahora, configura tu empresa y recibe tu primer reporte de inteligencia AI antes de que termines tu café.
          </p>
          <p className="text-sm md:text-base mb-8" style={{ color: BLACK, ...dmSans }}>
            Tu primer reporte gratis | Tu eliges la recurrencia | Cancela con un clic
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 rounded-full px-7 py-3.5 text-sm text-white transition-transform hover:scale-105 shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]"
            style={{ background: PURPLE, ...dmSansUpper }}
          >
            quiero unirme <Image src="/landing-2/icon-arrow-blue.png" alt="" width={16} height={16} />
          </Link>
        </Reveal>
      </section>

      {/* ── PRECIOS ─────────────────────────────────────────── */}
      <section id="precios" className="px-6 lg:px-[200px] py-20 md:py-28">
        <Reveal className="max-w-3xl mx-auto text-center mb-12">
          <h2 className={`${T.size50} mb-5 text-balance`} style={{ ...newake, color: NAVY }}>
            Elige con qué frecuencia quieres saber qué hace tu competencia
          </h2>
          <p className="text-base md:text-lg" style={{ color: BLACK, ...dmSans }}>
            Cada plan incluye el mismo nivel de profundidad de análisis. La diferencia es la frecuencia — cuántas veces al mes quieres recibir tu reporte.
          </p>
        </Reveal>

        <Reveal delay={100} className="flex items-center justify-center gap-4 mb-10">
          <span className="text-sm font-semibold" style={{ opacity: anual ? 0.5 : 1, ...dmSans }}>Pago mensual</span>
          <button
            onClick={() => setAnual(a => !a)}
            className="relative w-14 h-7 rounded-full transition-colors flex-shrink-0"
            style={{ background: anual ? PURPLE : 'rgba(25,20,98,0.15)' }}
            aria-label="Alternar pago anual"
          >
            <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all ${anual ? 'left-8' : 'left-1'}`} />
          </button>
          <span className="text-sm font-semibold" style={{ opacity: anual ? 1 : 0.5, ...dmSans }}>Pago anual</span>
          {anual && (
            <div className="rounded-full px-3 py-1 text-xs font-bold animate-pulse whitespace-nowrap" style={{ background: 'rgba(5,223,114,0.15)', color: '#05DF72', ...dmSans }}>
              🎉 Ahorras 20%
            </div>
          )}
        </Reveal>

        {/* grillas de precio: 1 col en móvil muy angosto, 2 desde sm, 4
            desde lg — el piso de fuente (T.planLabel) ya es lo bastante
            chico para no desbordar ninguna de estas columnas */}
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-5 max-w-6xl mx-auto mb-10">
          {plans.map((plan, i) => {
            const precioFinal = anual ? +(plan.price * 0.8).toFixed(2) : plan.price
            const precioAnual = +(precioFinal * 12).toFixed(2)
            return (
              <Reveal key={plan.freq} delay={i * 80} className="h-full">
                {/* Regla de forma: pestaña con muesca cóncava — la etiqueta
                    de frecuencia cuelga de la esquina superior-izquierda,
                    fundida con el cuerpo mediante una curva, no un escalón. */}
                <NotchCard
                  corner="tl"
                  color={plan.featured ? PURPLE : CREAM}
                  className="h-full min-w-0 transition-transform hover:-translate-y-1"
                  style={{ filter: 'drop-shadow(0 8px 18px rgba(0,0,0,0.12))' }}
                  tabClassName="px-5 sm:px-6 pt-3 sm:pt-4 pb-1"
                  tab={<div className={`${T.planLabel} break-words`} style={{ ...newake, color: plan.featured ? CREAM : NAVY }}>{plan.freq}</div>}
                  bodyClassName="flex-1 flex flex-col px-5 sm:px-6 pt-1 pb-4 sm:pb-5 text-left"
                  bodyStyle={{ color: plan.featured ? CREAM : NAVY }}
                >
                  {anual && <div className="text-sm line-through mb-1 opacity-70" style={dmSans}>${plan.price}/mes</div>}
                  <div className={`${T.planLabel} mb-1 break-words`} style={newake}>${precioFinal} USD</div>
                  {anual && (
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold mb-2 whitespace-nowrap" style={{ background: 'rgba(5,223,114,0.18)', color: '#05DF72', ...dmSans }}>
                      20% OFF
                    </div>
                  )}
                  <p className="text-xs sm:text-sm mt-1 leading-snug whitespace-pre-line" style={dmSans}>
                    {plan.desc}
                  </p>
                  <div className="mt-2 pt-2 border-t text-xs" style={{ borderColor: plan.featured ? 'rgba(255,255,255,0.25)' : 'rgba(25,20,98,0.1)', ...dmSans }}>
                    {plan.badge}
                    {anual && <div className="mt-1">${precioAnual}/año total</div>}
                  </div>
                </NotchCard>
              </Reveal>
            )
          })}
        </div>
        <Reveal delay={200} className="text-center text-sm md:text-base" style={{ color: BLACK, ...dmSans }}>
          Sin contratos anuales | Sin costos ocultos | Cancelas cuando quieras con un clic.
        </Reveal>
      </section>

      {/* ── MÓDULOS ─────────────────────────────────────────── */}
      <section id="modulos" className="px-6 lg:px-[200px] pt-20 md:pt-28 pb-6">
        <Reveal className="max-w-2xl mx-auto text-center mb-14">
          <h2 className={`${T.size50} mb-5 text-balance`} style={{ ...newake, color: NAVY }}>
            Tu analista de inteligencia trabaja mientras duermes
          </h2>
          <p className="text-base md:text-lg" style={{ color: BLACK, ...dmSans }}>
            Elige el módulo que necesitas. Cada sistema está entrenado específicamente para ese tipo de análisis.
          </p>
        </Reveal>
      </section>
      {/* separación vertical generosa (gap-y) para que el blur de sombra de
          una fila nunca se monte sobre la fila siguiente */}
      <section className="px-6 lg:px-[110px] pb-24">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-x-8 gap-y-14 md:gap-y-16">
          {modules.map((m, i) => (
            <Reveal key={m.n} delay={i * 100} className="h-full">
              {/* Regla D: relleno al 20% del color base + sombra de color al
                  80%. Regla de forma: el número cuelga en una pestaña con
                  muesca cóncava — arriba-derecha para 01/03, abajo-izquierda
                  para 02/04 (tal como en el diseño). filter:drop-shadow (no
                  box-shadow) porque sigue el contorno real de la silueta
                  compuesta (pestaña + cuerpo en L), no el rectángulo que
                  la delimita. */}
              <NotchCard
                corner={m.cornerClass === 'rounded-tr-none' ? 'tr' : 'bl'}
                color={withAlpha(m.color, 0.2)}
                className="h-full"
                style={{ filter: `drop-shadow(0 10px 22px ${withAlpha(m.color, 0.55)})` }}
                tabClassName="px-4 sm:px-5 pt-2 pb-0"
                tab={<div className={T.size80} style={{ ...newake, color: NAVY }}>{m.n}</div>}
                bodyClassName="flex-1 flex flex-col p-6 sm:p-8"
              >
                <h3 className={`${T.size50} mb-3`} style={{ ...newake, color: NAVY }}>{m.title}</h3>
                <p className="text-sm md:text-base leading-snug whitespace-pre-line mb-4" style={{ color: m.textColor, ...dmSans }}>{m.body}</p>
                {'bullets' in m && m.bullets && (
                  <ul className="text-sm md:text-base leading-snug mb-4 space-y-0.5" style={{ color: m.textColor, ...dmSans }}>
                    {m.bullets.map(b => <li key={b}>{b}</li>)}
                  </ul>
                )}
                <p className="text-xs md:text-sm mt-auto mb-3" style={{ color: m.textColor, ...dmSansUpper }}>{m.idealLabel} {m.ideal}</p>
                {m.active ? (
                  <Link
                    href="/register"
                    className="self-start inline-flex items-center gap-2 rounded-full px-6 py-3 text-base"
                    style={{ background: NAVY, color: CREAM, ...dmSansUpper }}
                  >
                    empezar ahora <Image src="/landing-2/icon-arrow-blue.png" alt="" width={16} height={16} />
                  </Link>
                ) : (
                  <div className="self-start inline-flex items-center gap-2 rounded-full px-6 py-3 text-base" style={{ background: NAVY, color: CREAM, ...dmSansUpper }}>
                    próximamente <Image src="/landing-2/icon-clock-white.png" alt="" width={18} height={18} />
                  </div>
                )}
              </NotchCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-[1520px] mx-auto grid lg:grid-cols-[771fr_621fr] gap-12">
          <div className="space-y-3 order-2 lg:order-1">
            {faqs.map((item, i) => {
              const open = openFaq === i
              return (
                <Reveal key={item.q} delay={Math.min(i, 5) * 60}>
                  <div className="rounded-[30px] shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] overflow-hidden" style={{ background: CREAM }}>
                    <button
                      onClick={() => setOpenFaq(open ? -1 : i)}
                      className="w-full flex items-center justify-between gap-4 sm:gap-6 text-left px-5 sm:px-6 md:px-8 py-4 sm:py-5"
                    >
                      <span className={T.size30} style={{ ...newake, color: NAVY }}>{item.q}</span>
                      {/* Regla F: ícono real +/− (sin círculo de fondo, tal
                          como en el diseño) */}
                      <span className="flex-shrink-0 w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center">
                        <Image
                          src={open ? '/landing-2/icon-plus-open.png' : '/landing-2/icon-plus-closed.png'}
                          alt=""
                          width={24}
                          height={24}
                        />
                      </span>
                    </button>
                    <div
                      className="grid transition-all duration-300 ease-out"
                      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
                    >
                      <div className="overflow-hidden">
                        <p className="px-5 sm:px-6 md:px-8 pb-6 text-sm md:text-base leading-relaxed" style={{ color: BLACK, ...dmSans, textAlign: 'justify' }}>{item.a}</p>
                      </div>
                    </div>
                  </div>
                </Reveal>
              )
            })}
          </div>
          <Reveal className="lg:sticky lg:top-28 self-start order-1 lg:order-2">
            <h2 className={`${T.size50} mb-5`} style={{ ...newake, color: NAVY }}>Preguntas frecuentes</h2>
            <p className="text-base md:text-lg mb-8" style={{ color: BLACK, ...dmSans, textAlign: 'justify' }}>
              Resolvemos las dudas más comunes sobre cómo funciona Omnireports, sus módulos y precios. Empieza gratis hoy mismo.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm text-white transition-transform hover:scale-105"
              style={{ background: PURPLE, ...dmSansUpper }}
            >
              quiero unirme <Image src="/landing-2/icon-arrow-blue.png" alt="" width={16} height={16} />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIOS (carrusel) + CONTACTO ──────────────── */}
      <section id="casos" className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-[1420px] mx-auto grid lg:grid-cols-[620fr_700fr] gap-10 items-start">
          <Reveal>
            {/* Regla C: esquinas superiores rectas (radii=[0,0,30,30]) */}
            <div className="rounded-[30px] rounded-t-none shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)] overflow-hidden" style={{ background: CREAM }}>
              <div className="px-6 sm:px-8 py-6 sm:py-8 text-center rounded-tr-none" style={{ background: PURPLE, color: CREAM }}>
                <p className={T.size30} style={newake}>
                  Lo que dicen quienes ya no esperan a enterarse tarde.
                </p>
              </div>
              <div className="p-6 sm:p-8">
                <div className={`${T.size40} mb-1`} style={{ ...newake, color: NAVY }}>{t.name}</div>
                <div className="text-base mb-4" style={{ color: NAVY, ...dmSans }}>{t.role} | {t.company}</div>
                <p className="text-sm md:text-base leading-relaxed mb-6" style={{ color: NAVY, ...dmSans }}>{t.quote}</p>
                {/* controles de carrusel — fila propia, sin solapar el texto */}
                <div className="flex items-center gap-3">
                  <CarouselArrow dir="left" onClick={prevTestimonial} ariaLabel="Testimonio anterior" />
                  <CarouselArrow dir="right" onClick={nextTestimonial} ariaLabel="Testimonio siguiente" />
                </div>
              </div>
            </div>
          </Reveal>

          <Reveal delay={150}>
            <div className="rounded-[30px] bg-white p-6 sm:p-8 md:p-10 shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]">
              {contactSent ? (
                <div className="text-center py-10">
                  <h3 className={`${T.size36} mb-3`} style={{ ...newake, color: NAVY }}>¡Listo!</h3>
                  <p style={{ color: BLACK, ...dmSans }}>Recibimos tu mensaje, te respondemos a la brevedad.</p>
                </div>
              ) : (
                <>
                  <h3 className={`${T.size36} mb-6 text-center`} style={{ ...newake, color: NAVY }}>¿Alguna duda en tu primer reporte?</h3>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                      <input value={contactName} onChange={e => setContactName(e.target.value)} placeholder="Nombre"
                        className="w-full rounded-full pl-10 pr-4 py-3 text-sm outline-none" style={{ background: 'white', ...dmSans }} />
                    </div>
                    <div className="relative">
                      <Phone size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                      <input value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="Teléfono"
                        className="w-full rounded-full pl-10 pr-4 py-3 text-sm outline-none" style={{ background: 'white', ...dmSans }} />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-4 mb-4">
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
                      <input type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="Correo"
                        className="w-full rounded-full pl-10 pr-4 py-3 text-sm outline-none" style={{ background: 'white', ...dmSans }} />
                    </div>
                    <input value={contactSubject} onChange={e => setContactSubject(e.target.value)} placeholder="Asunto"
                      className="w-full rounded-full px-4 py-3 text-sm outline-none" style={{ background: 'white', ...dmSans }} />
                  </div>
                  <div className="relative mb-5">
                    <MessageSquare size={16} className="absolute left-4 top-4 opacity-50" />
                    <textarea value={contactMessage} onChange={e => setContactMessage(e.target.value)} placeholder="Mensaje" rows={4}
                      className="w-full rounded-[24px] pl-10 pr-4 py-3 text-sm outline-none resize-none" style={{ background: 'white', ...dmSans }} />
                  </div>
                  {contactError && <p className="text-sm text-red-500 mb-4">{contactError}</p>}
                  <button
                    onClick={handleContactSubmit}
                    disabled={contactLoading || !contactName.trim() || !contactEmail.trim() || !contactMessage.trim()}
                    className="inline-flex items-center gap-2.5 rounded-full px-6 py-3 text-sm text-white transition-transform hover:scale-105 disabled:opacity-50"
                    style={{ background: PURPLE, ...dmSansUpper }}
                  >
                    {contactLoading ? 'Enviando...' : 'enviar'} <Image src="/landing-2/icon-envelope.png" alt="" width={16} height={16} />
                  </button>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="px-6 lg:px-[200px] py-16 border-t" style={{ borderColor: NAVY, background: CREAM }}>
        <div className="max-w-7xl mx-auto flex flex-wrap items-start justify-between gap-x-10 gap-y-8">
          <Image src="/landing-2/logo-full-dark.png" alt="Omni Reports" width={200} height={44} className="h-9 w-auto" />
          <nav className={`flex flex-col gap-1 ${T.footerNav}`} style={{ ...newake, color: BLACK }}>
            {navLinks.map(l => <a key={l.href} href={l.href} className="hover:opacity-60 transition-opacity">{l.label}</a>)}
          </nav>
          <nav className={`flex flex-col gap-1 ${T.footerNav}`} style={{ ...newake, color: BLACK }}>
            <Link href="/legal/aviso-de-privacidad" className="hover:opacity-60 transition-opacity">Aviso de Privacidad</Link>
            <Link href="/legal/terminos-y-condiciones" className="hover:opacity-60 transition-opacity">Términos y condiciones</Link>
          </nav>
          <div className="flex items-center gap-4">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
              <Image src="/landing-2/icon-instagram.png" alt="Instagram" width={26} height={26} />
            </a>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
              <Image src="/landing-2/icon-facebook.png" alt="Facebook" width={26} height={26} />
            </a>
          </div>
        </div>
      </footer>
      <div className={`px-6 lg:px-[200px] py-4 flex flex-col sm:flex-row items-center justify-between gap-2 ${T.copyright}`} style={{ background: CREAM, color: BLACK }}>
        <span style={newake}>© 2026 Omni Reports . Todos los derechos reservados.</span>
        <span style={newake}>By Bvro</span>
      </div>
    </main>
  )
}
