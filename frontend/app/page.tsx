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

// Igual que withAlpha, pero pre-mezclado en sólido contra BLANCO (el fondo
// real del diseño detrás de las tarjetas de módulo: el frame raíz de Figma
// es blanco y sólo header/hero/footer son crema) en vez de translúcido.
// Necesario porque la pestaña y el cuerpo son dos bloques que se tocan/
// solapan: con rgba() translúcido las capas se sumarían y se vería una
// franja más oscura en la costura. Con un sólido pre-mezclado, pestaña,
// filete y cuerpo son idénticos se toquen o no.
function blendOverWhite(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16)
  const r = (n >> 16) & 255
  const g = (n >> 8) & 255
  const b = n & 255
  const mix = (c: number) => Math.round(alpha * c + (1 - alpha) * 255)
  return `rgb(${mix(r)},${mix(g)},${mix(b)})`
}

// Path SVG EXACTO exportado de Figma ("Vector 1": el filete cóncavo que une
// la pestaña con el cuerpo en planes, pasos y módulos). Caja 50x50; en su
// orientación canónica rellena la esquina SUPERIOR-IZQUIERDA (los dos bordes
// rectos que se juntan en (0,0) y la curva que los une).
const NOTCH_PATH = 'M0.0159429 50V45.1127C0.478188 11.1869 11.109 0.281998 47.1078 0.0054245H50C49.0182 -0.00177002 48.0542 -0.00184631 47.1078 0.0054245H0.0159429V45.1127C-0.00556884 46.6915 -0.0050582 48.3202 0.0159429 50Z'

function ConcaveFillet({
  size, rotate = 0, color, style,
}: { size: string | number; rotate?: number; color: string; style?: CSSProperties }) {
  return (
    <span aria-hidden className="absolute pointer-events-none" style={{ width: size, height: size, ...style }}>
      <svg width="100%" height="100%" viewBox="0 0 50 50" style={{ display: 'block', transform: `rotate(${rotate}deg)` }}>
        <path d={NOTCH_PATH} fill={color} />
      </svg>
    </span>
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
// corner = de qué lado se adosa la pestaña con el número: 'tr' (arriba, a la
// derecha del cuerpo) en 01/03, 'bl' (abajo, a la izquierda) en 02/04.
// descColor/idealColor: Figma pinta el copy de cada tarjeta con un color
// distinto (azul marino o negro) — se respeta campo por campo.
const modules = [
  {
    n: '01', title: 'Inteligencia Competitiva Sectorial', color: '#51A2FF', corner: 'tr' as const,
    body: <>Sabe exactamente qué está haciendo tu competencia — antes de que llegue a tus clientes.{'\n\n'}<span className="font-bold">Omnireports</span> escanea automáticamente sitios, directorios, redes sociales, sitios de reclutamiento, bolsas de trabajo, medios, bases de patentes y fuentes regulatorias.{'\n'}Llega en minutos.</>,
    bullets: [
      'Movimientos y estrategias de tus competidores principales',
      'Cambios de precios y nuevas campañas activas',
      'Lanzamientos de productos y nuevas funcionalidades',
      'Regulaciones y cambios normativos que afectan tu sector',
      'Cobertura en medios y menciones en redes sociales',
    ],
    ideal: ['Directores comerciales', 'marketing', 'estrategia', 'Fundadores'],
    descColor: NAVY, idealColor: NAVY, active: true,
  },
  {
    n: '02', title: 'Radar de Ciberseguridad Empresarial', color: '#05DF72', corner: 'bl' as const,
    body: <>Tu empresa tiene vulnerabilidades que no sabes que existen. Este módulo las detecta antes de que alguien las explote.{'\n\n'}Monitoreo continuo de CVEs, brechas en tu sector y postura de seguridad de tu dominio. Tu equipo de seguridad disponible 24/7, sin el costo de uno.</>,
    ideal: ['CISOs', 'CTOs', 'Equipos de tecnología'],
    descColor: BLACK, idealColor: BLACK, active: false,
  },
  {
    n: '03', title: 'Salud Corporativa \npara RRHH', color: '#A684FF', corner: 'tr' as const,
    body: <>Retén talento antes de perderlo. Detecta señales de burnout, rotación y clima laboral antes de que se conviertan en un problema.{'\n\n'}IA especializada en psicología organizacional y bienestar laboral. Analiza tendencias globales y las adapta a tu empresa, industria y cultura de trabajo específica.</>,
    ideal: ['Directores de RRHH', 'Gerentes de Personas', 'CEO'],
    descColor: BLACK, idealColor: NAVY, active: false,
  },
  {
    n: '04', title: 'Perfil Clave \nEjecutivo', color: '#FFB900', corner: 'bl' as const,
    body: <>Entra a cada negociación sabiendo más que tu contraparte.{'\n\n'}Construimos un perfil 360° de cualquier ejecutivo: estilo de liderazgo, red de contactos, historial de decisiones y palancas de influencia para negociación estratégica.</>,
    ideal: ['CEOs', 'Directores Comerciales', 'M&A', 'Equipos de ventas enterprise'],
    descColor: BLACK, idealColor: BLACK, active: false,
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

// ─────────────────────────────────────────────────────────────────────
// FORMAS "NOTCH" — planes, pasos y módulos. Cada tarjeta son DOS bloques
// independientes (pestaña + cuerpo, mismo color, sin path booleano) más el
// filete cóncavo exacto de Figma ("Vector 1") que los une, con la
// geometría medida del diseño y expresada en `em` del tamaño de fuente de
// la tarjeta, para que escale fluido sin saltos. Las sombras usan
// `filter: drop-shadow()`, cuyo 3er valor es la DESVIACIÓN ESTÁNDAR (no el
// radio, como en box-shadow): el radio 30 de Figma equivale a σ=15px.

// Tamaños base a 1920 (Figma): título 50 / copy 22 / copy pasos 20, en
// versiones fluidas. `leading` en px enteros de Figma (Figma redondea el
// interlineado: 48/50, 29/22, 26/20).
const F50 = 'clamp(1.875rem, 1.375rem + 2vw, 3.125rem)'
const B22 = 'text-[clamp(0.9375rem,0.826rem+0.4575vw,1.375rem)] leading-[1.318]'
const B20 = 'text-[clamp(0.875rem,0.779rem+0.392vw,1.25rem)] leading-[1.3]'
// Newake queda ~0.05em más arriba en CSS que en Figma (medido por píxel).
const newakeLift: CSSProperties = { position: 'relative', top: '0.05em' }

// ── PLANES (Sección 7) ──────────────────────────────────────────────
// Cuerpo 396×235 (radio 30, esquina sup-izq plana). Pestaña 303×105 (76.5%
// del ancho) encima, radio 30 sólo arriba, que se solapa 7.7px con el
// cuerpo. Filete 50×50 pegado al lado derecho de la pestaña, sobre el borde
// superior del cuerpo. Sombra 0 0 σ15 negro al 15%.
function PlanCard({
  color, freq, freqColor, children, className = '',
}: {
  color: string; freq: string; freqColor: string; children: React.ReactNode; className?: string
}) {
  return (
    <div
      className={`relative flex flex-col ${className}`}
      style={{ fontSize: F50, paddingTop: '1.946em', filter: 'drop-shadow(0 0 0.3em rgba(0,0,0,0.15))' }}
    >
      <div
        className="absolute flex items-start"
        style={{ top: 0, left: 0, width: '76.5%', height: '2.1em', background: color, borderRadius: '0.6em 0.6em 0 0', padding: '0.58em 0.32em 0' }}
      >
        <span style={{ ...newake, ...newakeLift, color: freqColor, lineHeight: 0.96, whiteSpace: 'nowrap' }}>{freq}</span>
      </div>
      <ConcaveFillet size="1em" rotate={-90} color={color} style={{ left: 'calc(76.5% - 0.5px)', top: '0.96em' }} />
      <div
        data-plan-body={freq}
        className="relative flex-1 flex flex-col text-left"
        style={{ background: color, borderRadius: '0 0.6em 0.6em 0.6em', padding: '0.8em', minHeight: '4.7em' }}
      >
        {children}
      </div>
    </div>
  )
}

// ── PASOS (Sección 3) ───────────────────────────────────────────────
// Cuerpo 561×230 (radio 30, esquina sup-izq plana). Pestaña 360×112 (64.2%)
// o 280×112 (49.9%, sin flecha) encima, radio 30 sólo arriba; filete 49×49
// pegado a su lado derecho. La flecha mide 70×70 y va a la derecha de la
// pestaña. Sombra 0 0 σ15 negro al 15%.
function PasoCard({
  n, arrow, title, body,
}: { n: string; arrow: boolean; title: string; body: React.ReactNode }) {
  const tabW = arrow ? '64.17%' : '49.91%'
  return (
    <div
      className="relative flex flex-col h-full"
      style={{ fontSize: F50, paddingTop: '2.226em', filter: 'drop-shadow(0 0 0.3em rgba(0,0,0,0.15))' }}
    >
      <div
        className="absolute flex items-center justify-between"
        style={{ top: 0, left: 0, width: tabW, height: '2.24em', background: CREAM, borderRadius: '0.6em 0.6em 0 0', padding: '0 0.64em 0 0.62em' }}
      >
        <span style={{ ...newake, ...newakeLift, color: NAVY, lineHeight: 0.96, whiteSpace: 'nowrap' }}>{n}</span>
        {arrow && <Image src="/landing-2/icon-arrow-step.png" alt="" width={70} height={70} style={{ width: '1.4em', height: '1.4em' }} />}
      </div>
      <ConcaveFillet size="0.98em" rotate={-90} color={CREAM} style={{ left: `calc(${tabW} - 0.5px)`, top: '1.264em' }} />
      <div
        data-paso-body={n}
        className="relative flex-1"
        style={{ background: CREAM, borderRadius: '0 0.6em 0.6em 0.6em', padding: '0.6em 0.6em 0.64em' }}
      >
        <h3
          className="text-[clamp(1.375rem,1.05rem+1.3vw,2.188rem)] leading-[0.97]"
          style={{ ...newake, ...newakeLift, color: NAVY }}
        >{title}</h3>
        <p className={B20} style={{ marginTop: '1.55em', color: NAVY, ...dmSans }}>{body}</p>
      </div>
    </div>
  )
}

// ── MÓDULOS (Secciones 9-10 / renders 11-12) ────────────────────────
// Geometría EXACTA de Figma (Frame 127/128 + Group 127), expresada en `em`
// de F — el tamaño del número (80px a 1920) — para que todo escale junto:
//   · cuerpo: radios 30 (0.375em), salvo la esquina pegada a la pestaña (0)
//   · pestaña: 112×197 (1.4em × 2.4625em), ADOSADA AL COSTADO del cuerpo
//     (a la derecha y arriba en 01/03; a la izquierda y abajo en 02/04),
//     con radio 30 sólo en sus dos esquinas EXTERIORES; número centrado
//   · filete cóncavo (Vector 1): 50×50 (0.625em) pegado al borde del cuerpo,
//     justo debajo (01/03) o encima (02/04) de la pestaña
//   · relleno: color base al 20% sobre blanco, en sólido (pestaña, filete y
//     cuerpo idénticos); sombra 0 0 30px (0.375em) al 80% del color base
//   · el contenido va centrado en vertical dentro de un margen de 80/40
const MOD_F = 'clamp(2.5rem, 1.8625rem + 2.614vw, 5rem)'

function ModuleCard({
  corner, color, glow, number, minHeight, action, children,
}: {
  corner: 'tr' | 'bl'; color: string; glow: string; number: string
  minHeight?: string; action: React.ReactNode; children: React.ReactNode
}) {
  const isTR = corner === 'tr'
  const R = '0.375em'
  const tabPos: CSSProperties = isTR
    ? { left: 'calc(100% - 1px)', top: 0, borderRadius: `0 ${R} ${R} 0`, paddingLeft: 1 }
    : { right: 'calc(100% - 1px)', bottom: 0, borderRadius: `${R} 0 0 ${R}`, paddingRight: 1 }
  const filletPos: CSSProperties = isTR
    ? { left: 'calc(100% - 0.5px)', top: 'calc(2.4625em - 0.5px)' }
    : { right: 'calc(100% - 0.5px)', bottom: 'calc(2.4625em - 0.5px)' }
  return (
    <div
      data-module={number}
      className={`relative h-full ${isTR ? 'mr-[1.4em]' : 'ml-[1.4em]'} lg:mx-0`}
      style={{ fontSize: MOD_F, filter: `drop-shadow(0 0 0.1875em ${glow})` }}
    >
      <div
        data-module-body={number}
        className="relative h-full flex flex-col justify-center"
        style={{
          background: color, padding: '1em 0.5em', gap: '0.375em', minHeight,
          borderRadius: isTR ? `${R} 0 ${R} ${R}` : `${R} ${R} ${R} 0`,
        }}
      >
        {children}
        {action}
      </div>
      <div
        className="absolute flex items-center justify-center"
        style={{ width: 'calc(1.4em + 1px)', height: '2.4625em', background: color, ...tabPos }}
      >
        <span style={{ ...newake, color: NAVY, fontSize: '1em', lineHeight: 0.9625, position: 'relative', top: '0.05em' }}>{number}</span>
      </div>
      <ConcaveFillet size="0.625em" rotate={isTR ? 0 : 180} color={color} style={filletPos} />
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
    <main style={{ background: WHITE, color: BLACK }} className="min-h-screen overflow-x-hidden">
      {/* ── HEADER 2 (barra social) ─────────────────────────── */}
      {/* orden Figma: Facebook primero, Instagram después */}
      <div className="hidden md:flex items-center justify-end gap-5 px-6 lg:px-[200px] py-2.5" style={{ background: CREAM }}>
        <a href="https://facebook.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
          <Image src="/landing-2/icon-facebook.png" alt="Facebook" width={20} height={20} />
        </a>
        <a href="https://instagram.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
          <Image src="/landing-2/icon-instagram.png" alt="Instagram" width={20} height={20} />
        </a>
      </div>

      {/* ── HEADER ─────────────────────────────────────────── */}
      <header id="inicio" className="sticky top-0 z-50" style={{ background: CREAM }}>
        <div className="flex items-center justify-between px-6 md:px-10 lg:px-[200px] py-4 md:py-5">
          <Link href="/" className="flex items-center">
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
              href="/login"
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
            <Link href="/login" className="rounded-full px-5 py-3 text-sm text-center" style={{ background: PURPLE, color: NAVY, ...dmSansUpper }}>Iniciar sesión</Link>
            <Link href="/register" className="rounded-full px-5 py-3 text-sm text-center border" style={{ borderColor: NAVY, ...dmSansUpper }}>Prueba Gratis 7 días</Link>
          </div>
        )}
      </header>

      {/* ── HERO ───────────────────────────────────────────── */}
      <section className="relative px-6 pt-16 pb-24 md:pb-32 text-center overflow-hidden" style={{ background: CREAM }}>
        {/* Fondo hexagonal estático — dos copias de la misma imagen, una
            normal y otra rotada 180° (no animada, no gira), posicionadas
            en esquinas opuestas: arriba-izquierda y abajo-derecha del
            hero, tal como en Figma (no ambas arriba). */}
        <div className="pointer-events-none absolute left-0 top-0 w-[30%] aspect-[979/740] opacity-50 rotate-180">
          <Image src="/landing-2/bg-hexa.png" alt="" fill sizes="30vw" className="object-contain" />
        </div>
        <div className="pointer-events-none absolute right-0 bottom-0 w-[30%] aspect-[979/740] opacity-50">
          <Image src="/landing-2/bg-hexa.png" alt="" fill sizes="30vw" className="object-contain" />
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
        <div className="max-w-6xl mx-auto grid md:grid-cols-[minmax(0,420px)_1fr] gap-10 md:gap-16 items-center">
          <Reveal>
            <h2 className={`${T.size50} text-balance`} style={{ ...newake, color: NAVY }}>
              ¿Te ha pasado alguna de estas?
            </h2>
          </Reveal>
          <Reveal delay={150}>
            <div
              className="relative rounded-[30px] bg-white p-6 sm:p-8 md:p-14 text-center shadow-[0_0_30px_-10px_rgba(0,0,0,0.15)]"
              style={{ border: `2px solid ${PURPLE}` }}
            >
              <h3 className={`${T.size40} mb-4`} style={{ ...newake, color: NAVY }}>
                &ldquo;Me enteré en la reunión con el cliente&rdquo;
              </h3>
              <p className="text-base md:text-lg max-w-xl mx-auto" style={{ color: NAVY, ...dmSans }}>
                Tu competidor lanzó un descuento o un producto nuevo — y lo supiste cuando tu cliente te lo mencionó, no antes. Ya era tarde para reaccionar.
              </p>
              {/* pleca de cita: esquinas alternadas (recta arriba-izq. y
                  abajo-der., redondeada en las otras dos) + texto
                  subrayado con "Omnireports" en negrita, tal como Figma. */}
              <div
                className="mt-8 mx-auto max-w-lg rounded-none rounded-tr-[24px] rounded-bl-[24px] px-6 sm:px-8 py-5 sm:py-6 text-sm md:text-base underline"
                style={{ background: PURPLE, color: CREAM, ...dmSansUpper }}
              >
                Si te identificaste con alguna de estas, <span className="font-bold">Omnireports</span> fue diseñado exactamente para ti.
              </div>
              {/* controles de carrusel: A LOS LADOS de la tarjeta, no
                  debajo — sobresalen del borde izq./der. a la altura de
                  la pleca de cita. */}
              <div className="absolute left-0 bottom-14 sm:bottom-20 -translate-x-1/2">
                <CarouselArrow dir="left" ariaLabel="Anterior" />
              </div>
              <div className="absolute right-0 bottom-14 sm:bottom-20 translate-x-1/2">
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
      <section id="servicios" className="px-6 lg:px-[2.83vw] pb-20 md:pb-28">
        <div className="max-w-[1791.6px] mx-auto grid md:grid-cols-3 gap-y-8 md:gap-x-[clamp(16px,2.83vw,54.3px)]">
          {[
            {
              n: 'paso 01', title: 'Dinos quién eres', arrow: true,
              body: <><span className="font-bold">Crea tu cuenta en 2 minutos.</span> Dinos el nombre de tu empresa, tu industria y quiénes son tus competidores principales. Sin setup complicado.</>,
            },
            {
              n: 'paso 02', title: 'Omnireports hace el trabajo', arrow: true,
              body: <><span className="font-bold">Omnireports escanea automáticamente sitios,</span> directorios, redes sociales, sitios de reclutamiento, bolsas de trabajo, medios, bases de patentes y fuentes regulatorias.</>,
            },
            {
              n: 'paso 03', title: 'Recibes el análisis', arrow: false,
              body: <>El reporte ejecutivo <span className="font-bold">llega a tu email o WhatsApp</span> en el horario que elijas — diario, semanal, quincenal o mensual. En PDF. En español. Listo para leer.</>,
            },
          ].map((step, i) => (
            <Reveal key={step.n} delay={i * 120} className="h-full">
              <PasoCard n={step.n} arrow={step.arrow} title={step.title} body={step.body} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CONSTELACIÓN DE FEATURES ───────────────────────── */}
      <section className="px-6 lg:px-[200px] py-20 md:py-28">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-14 items-center">
          <Reveal>
            <div className="rounded-[30px] p-6 sm:p-8 md:p-10 max-w-xl" style={{ background: CREAM }}>
              <h3 className={`${T.size50} mb-4`} style={{ ...newake, color: NAVY }}>Hasta 10 competidores monitoreados</h3>
              <p className="text-base md:text-lg mb-8" style={{ color: BLACK, ...dmSans, textAlign: 'justify' }}>
                No importa si son 3 o 10. <span className="font-bold">Omnireports</span> los rastrea todos simultáneamente, 24/7, sin que pierdas nada.
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
            {/* Anillos HEXAGONALES (no circulares) + posiciones exactas de
                Figma para cada píldora (no repartidas uniformemente en un
                círculo — siguen los vértices reales del hexágono grande). */}
            <div className="relative aspect-square max-w-[280px] sm:max-w-md mx-auto">
              <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full overflow-visible">
                <polygon points="50,0 100,25 100,75 50,100 0,75 0,25" fill="none" stroke={PURPLE} strokeWidth="0.4" />
                <polygon points="50,16.7 88.4,33.3 88.4,66.7 50,83.3 11.6,66.7 11.6,33.3" fill="none" stroke={NAVY} strokeWidth="0.4" />
              </svg>
              <div className="absolute inset-[30%] overflow-hidden">
                <Image src="/landing-2/logo-hexagon-mark.png" alt="Omni Reports" fill sizes="30vw" className="object-contain" />
              </div>
              {/* Regla G (pills): solo 1 de 8 es morada rellena; posiciones
                  exactas (centro en %) tomadas de las coordenadas reales de
                  Figma dentro del bloque del diagrama. */}
              {[
                { label: '10 competidores vigilados', filled: true, border: PURPLE, x: 27.5, y: 16.5 },
                { label: 'Alertas anticipadas', filled: false, border: PURPLE, x: 61.4, y: 7.4 },
                { label: 'Benchmark competitivo', filled: false, border: NAVY, x: 74.0, y: 31.8 },
                { label: 'Resumen ejecutivo', filled: false, border: PURPLE, x: 89.1, y: 49.9 },
                { label: 'Comparte gratis', filled: false, border: PURPLE, x: 88.0, y: 71.0 },
                { label: 'Dashboard + PDF', filled: false, border: NAVY, x: 60.6, y: 77.5 },
                { label: 'Recomendaciones accionables', filled: false, border: PURPLE, x: 18.3, y: 80.1 },
                { label: 'WhatsApp y email', filled: false, border: NAVY, x: 25.4, y: 42.3 },
              ].map((item) => (
                <span
                  key={item.label}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[8px] xs:text-[10px] sm:text-xs shadow-[0_0_20px_-8px_rgba(0,0,0,0.15)]"
                  style={{
                    left: `${item.x}%`, top: `${item.y}%`,
                    ...dmSansUpper,
                    background: item.filled ? PURPLE : WHITE,
                    color: item.filled ? CREAM : NAVY,
                    border: item.filled ? 'none' : `1px solid ${item.border}`,
                  }}
                >
                  {item.label}
                </span>
              ))}
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
            {/* Orden real de Figma: título, checklist, precio, y el
                badge "98% más barato" AL FINAL (no antes del título). */}
            <h3 className={`${T.size50} mb-5`} style={{ ...newake, color: NAVY }}>OMNIREPORTS</h3>
            <ul className="space-y-2.5 text-sm md:text-base mb-8" style={{ color: NAVY, ...dmSans }}>
              {['Monitorea 24/7 sin interrupciones', 'Reporte listo en menos de 24 horas', 'No tiene vacaciones, nunca falla', 'Cubre web, redes, medios, patentes, regulaciones', 'Análisis consistente, estructurado y accionable', 'Sin contratos, sin sorpresas, cancela cuando quieras'].map(line => (
                <li key={line} className="flex gap-2.5"><span style={{ color: PURPLE }}>✓</span>{line}</li>
              ))}
            </ul>
            <div className="flex flex-wrap items-baseline gap-3 mb-6">
              <span className={T.size50} style={{ color: PURPLE, ...dmSansUpper, fontWeight: 700 }}>desde $49</span>
              <span className={T.usdMes} style={{ color: NAVY, ...dmSansUpper }}>USD/mes</span>
            </div>
            <NotchTab corner="tl" color={CREAM} radius={20} className={`px-4 sm:px-5 py-1.5 sm:py-2 ${T.size35}`} style={{ ...newake, color: NAVY }}>
              98% más barato
            </NotchTab>
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
      <section id="precios" className="px-6 lg:px-[4vw] py-20 md:py-28">
        <Reveal className="max-w-[820px] mx-auto text-center mb-12">
          <h2 className={`${T.size50} mb-5 text-balance`} style={{ ...newake, color: NAVY }}>
            Elige con qué frecuencia quieres saber qué hace tu competencia
          </h2>
          <p className={B22} style={{ color: BLACK, ...dmSans }}>
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
        <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-x-[clamp(16px,3.125vw,60px)] gap-y-8 max-w-[1764px] mx-auto mb-10">
          {plans.map((plan, i) => {
            const precioFinal = anual ? +(plan.price * 0.8).toFixed(2) : plan.price
            const precioAnual = +(precioFinal * 12).toFixed(2)
            const FIRST = 'Tu primer reporte es gratis.'
            return (
              <Reveal key={plan.freq} delay={i * 80} className="h-full">
                <PlanCard
                  color={plan.featured ? PURPLE : CREAM}
                  freq={plan.freq}
                  freqColor={plan.featured ? WHITE : NAVY}
                  className="h-full min-w-0 transition-transform hover:-translate-y-1"
                >
                  {anual && <div className="text-sm line-through mb-1 opacity-70" style={{ color: plan.featured ? WHITE : NAVY, ...dmSans }}>${plan.price}/mes</div>}
                  <div style={{ ...newake, ...newakeLift, lineHeight: 0.96, color: plan.featured ? WHITE : NAVY, marginBottom: '0.4em', whiteSpace: 'nowrap' }}>
                    ${precioFinal} <span style={{ fontSize: '0.6em' }}>USD</span>
                  </div>
                  {anual && (
                    <div className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold mb-2 whitespace-nowrap self-start" style={{ background: 'rgba(5,223,114,0.18)', color: '#05DF72', ...dmSans }}>
                      20% OFF
                    </div>
                  )}
                  <p className={`${B22} whitespace-pre-line`} style={{ color: plan.featured ? WHITE : BLACK, ...dmSans }}>
                    <span className="font-bold">{FIRST}</span>{plan.desc.slice(FIRST.length)}
                  </p>
                  {anual && <div className="mt-2 text-xs" style={{ color: plan.featured ? WHITE : NAVY, ...dmSans }}>${precioAnual}/año total</div>}
                  <div className="mt-auto pt-[0.5em]">
                    <Link
                      href="/register"
                      className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm transition-transform hover:scale-105"
                      style={{ background: NAVY, color: CREAM, ...dmSansUpper }}
                    >
                      Contratar <Image src="/landing-2/icon-arrow-blue.png" alt="" width={14} height={14} />
                    </Link>
                  </div>
                </PlanCard>
              </Reveal>
            )
          })}
        </div>
        <Reveal delay={200} className={`text-center whitespace-pre-wrap ${B22}`} style={{ color: BLACK, ...dmSans }}>
          {'Sin contratos anuales     |     Sin costos ocultos     |     Cancelas cuando quieras con un clic.'}
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
      {/* Dos filas, cada una con las columnas exactas de Figma: 808 | 190 |
          781 (fila 1, ancho 1779) y 730 | 190 | 730 (fila 2, ancho 1650).
          La columna central de 190 es el hueco por el que asoman las
          pestañas (112 c/u, se cruzan 34 en x pero a distinta altura). */}
      <section className="px-6 pb-24">
        {[
          { mods: [modules[0], modules[1]], max: 'max-w-[1779px]', cols: 'lg:grid-cols-[minmax(0,808fr)_minmax(0,190fr)_minmax(0,781fr)]', minH: undefined as string | undefined, gap: '' },
          { mods: [modules[2], modules[3]], max: 'max-w-[1650px]', cols: 'lg:grid-cols-[minmax(0,730fr)_minmax(0,190fr)_minmax(0,730fr)]', minH: '7em', gap: 'mt-14 lg:mt-20' },
        ].map((row, ri) => (
          <div key={ri} className={`mx-auto grid grid-cols-1 gap-y-14 ${row.max} ${row.cols} ${row.gap}`}>
            {row.mods.map((m, i) => (
              <Reveal key={m.n} delay={(ri * 2 + i) * 100} className={`h-full ${i === 0 ? 'lg:col-start-1' : 'lg:col-start-3'}`}>
                <ModuleCard
                  corner={m.corner}
                  color={blendOverWhite(m.color, 0.2)}
                  glow={withAlpha(m.color, 0.8)}
                  number={m.n}
                  minHeight={row.minH}
                  action={m.active ? null : (
                    <div
                      className="absolute right-0 bottom-0 flex items-center justify-between"
                      style={{ width: '3.6875em', height: '0.6875em', padding: '0 0.5em', background: NAVY, color: CREAM, borderRadius: '0.375em 0 0.375em 0', boxShadow: '0 0 0.375em rgba(0,0,0,0.15)' }}
                    >
                      <span style={{ ...dmSansUpper, fontSize: '0.3em', lineHeight: 1.3 }}>próximamente</span>
                      <Image src="/landing-2/icon-clock-white.png" alt="" width={20} height={20} style={{ width: '0.25em', height: '0.25em' }} />
                    </div>
                  )}
                >
                  <div style={{ maxWidth: '8.7625em' }}>
                    <h3 className="relative top-[0.05em] whitespace-pre-line text-[clamp(1.875rem,1.375rem+2vw,3.125rem)] leading-[0.96]" style={{ ...newake, color: NAVY }}>{m.title}</h3>
                  </div>
                  <div style={{ maxWidth: '8.7625em' }}>
                    <p className="text-[clamp(0.9375rem,0.826rem+0.4575vw,1.375rem)] leading-[1.318] whitespace-pre-line" style={{ color: m.descColor, ...dmSans }}>{m.body}</p>
                  </div>
                  {'bullets' in m && m.bullets && (
                    <ul className="text-[clamp(0.9375rem,0.826rem+0.4575vw,1.375rem)] leading-[1.318] list-disc pl-[1.5em]" style={{ color: m.descColor, ...dmSans }}>
                      {m.bullets.map(b => <li key={b}>{b}</li>)}
                    </ul>
                  )}
                  <p className="text-[clamp(0.75rem,0.65rem+0.3vw,1rem)] leading-[1.3125]" style={{ color: m.idealColor, ...dmSansUpper, whiteSpace: 'pre-wrap' }}>
                    <span className="font-bold">Ideal para:</span>{' ' + m.ideal.join('     |     ')}
                  </p>
                </ModuleCard>
              </Reveal>
            ))}
          </div>
        ))}
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
          <Reveal className="relative">
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
                <p className="text-sm md:text-base leading-relaxed" style={{ color: NAVY, ...dmSans }}>{t.quote}</p>
              </div>
            </div>
            {/* controles de carrusel: A LOS LADOS, a la altura de la
                pleca morada (no debajo del contenido). */}
            <div className="absolute left-0 top-[95px] sm:top-[110px] -translate-x-1/2">
              <CarouselArrow dir="left" onClick={prevTestimonial} ariaLabel="Testimonio anterior" />
            </div>
            <div className="absolute right-0 top-[95px] sm:top-[110px] translate-x-1/2">
              <CarouselArrow dir="right" onClick={nextTestimonial} ariaLabel="Testimonio siguiente" />
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
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
              <Image src="/landing-2/icon-facebook.png" alt="Facebook" width={26} height={26} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" className="opacity-90 hover:opacity-100 transition-opacity">
              <Image src="/landing-2/icon-instagram.png" alt="Instagram" width={26} height={26} />
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
