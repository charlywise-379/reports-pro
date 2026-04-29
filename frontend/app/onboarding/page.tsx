'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import {
  Zap, ArrowRight, ArrowLeft, CheckCircle, Building2,
  Users, Target, Plus, X, Mail, Phone, BarChart2, TrendingUp,
  ShieldAlert, Newspaper, Radio, MapPin, Star
} from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Tu empresa' },
  { id: 2, title: 'Posicionamiento' },
  { id: 3, title: 'Competidores directos' },
  { id: 4, title: 'Competidores indirectos' },
  { id: 5, title: 'Áreas a monitorear' },
  { id: 6, title: 'Entrega' },
  { id: 7, title: 'Confirmar' },
]

const emptyCompetitor = () => ({
  name: '', products: '', website: '',
  ig: '', fb: '', tt: '', yt: '', lin: '', x: '',
  presence: 'LOCAL', threat: 5
})

const emptyProduct = () => ({ name: '', price: '' })

const industries = [
  'Manufactura', 'Retail / Comercio', 'Tecnología', 'Finanzas',
  'Salud', 'Educación', 'Alimentos y Bebidas', 'Construcción',
  'Logística', 'Turismo', 'Servicios profesionales', 'Automotriz',
  'Energía', 'Telecomunicaciones', 'Farmacéutica', 'Otro'
]

const frequencies = [
  { value: 'DAILY', label: 'Diario', price: '$29.99', desc: 'Cada día hábil' },
  { value: 'WEEKLY', label: 'Semanal', price: '$25.00', desc: 'Cada semana', popular: true },
  { value: 'BIWEEKLY', label: 'Quincenal', price: '$22.00', desc: 'Cada 15 días' },
  { value: 'MONTHLY', label: 'Mensual', price: '$20.00', desc: 'Una vez al mes' },
]

const monitorOptions = [
  { value: 'INDUSTRIES', label: 'Industrias a monitorear', icon: Building2 },
  { value: 'PRICES', label: 'Precios de competidores', icon: TrendingUp },
  { value: 'CAMPAIGNS', label: 'Campañas de competidores', icon: Radio },
  { value: 'LAUNCHES', label: 'Lanzamientos de productos', icon: Star },
  { value: 'REGULATIONS', label: 'Regulaciones del mercado', icon: ShieldAlert },
  { value: 'NEWS', label: 'Medios y noticias', icon: Newspaper },
  { value: 'SOCIAL', label: 'Redes sociales competidores', icon: Users },
  { value: 'EXPANSION', label: 'Expansión geográfica', icon: MapPin },
  { value: 'INDUSTRY_DATA', label: 'Datos relevantes industria', icon: BarChart2 },
]

interface CompetitorFormProps {
  type: 'direct' | 'indirect'
  list: any[]
  onUpdate: (type: 'direct' | 'indirect', i: number, field: string, val: any) => void
  onAdd: (type: 'direct' | 'indirect') => void
  onRemove: (type: 'direct' | 'indirect', i: number) => void
}

function CompetitorForm({ type, list, onUpdate, onAdd, onRemove }: CompetitorFormProps) {
  return (
    <div className="space-y-6">
      {list.map((comp, i) => (
        <div key={i} className="bg-white/3 border border-white/8 rounded-2xl p-5 relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-blue-500/20 border border-blue-500/30 rounded-lg flex items-center justify-center text-blue-400 text-xs font-black">{i + 1}</div>
              <span className="text-sm font-semibold text-gray-300">
                {type === 'direct' ? 'Competidor directo' : 'Competidor indirecto'} #{i + 1}
              </span>
            </div>
            {list.length > 1 && (
              <button type="button" onClick={() => onRemove(type, i)}
                className="w-7 h-7 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg flex items-center justify-center transition-all">
                <X size={13} className="text-red-400" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nombre del competidor *</label>
              <input type="text" value={comp.name} onChange={e => onUpdate(type, i, 'name', e.target.value)}
                placeholder="Empresa competidora"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Sitio web</label>
              <input type="text" value={comp.website} onChange={e => onUpdate(type, i, 'website', e.target.value)}
                placeholder="www.competidor.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-1 block">Productos o servicios en competencia</label>
            <input type="text" value={comp.products} onChange={e => onUpdate(type, i, 'products', e.target.value)}
              placeholder="Ej: Línea de empaque industrial..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
          </div>

          <div className="mb-4">
            <label className="text-xs text-gray-500 mb-3 block">Redes sociales</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'ig', label: 'Instagram', placeholder: '@usuario' },
                { key: 'fb', label: 'Facebook', placeholder: 'facebook.com/...' },
                { key: 'tt', label: 'TikTok', placeholder: '@usuario' },
                { key: 'yt', label: 'YouTube', placeholder: 'Canal' },
                { key: 'lin', label: 'LinkedIn', placeholder: 'linkedin.com/...' },
                { key: 'x', label: 'X (Twitter)', placeholder: '@usuario' },
              ].map(soc => (
                <div key={soc.key}>
                  <label className="text-xs text-gray-600 mb-1 block">{soc.label}</label>
                  <input type="text" value={comp[soc.key]} onChange={e => onUpdate(type, i, soc.key, e.target.value)}
                    placeholder={soc.placeholder}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-2 block">Presencia en el mercado</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { value: 'LOCAL', label: 'Local' },
                  { value: 'REGIONAL', label: 'Regional' },
                  { value: 'NATIONAL', label: 'Nacional' },
                  { value: 'GLOBAL', label: 'Global' },
                ].map(p => (
                  <button key={p.value} type="button" onClick={() => onUpdate(type, i, 'presence', p.value)}
                    className={`text-xs py-2 px-3 rounded-lg border transition-all ${comp.presence === p.value ? 'bg-blue-600/25 border-blue-500/50 text-blue-300 font-semibold' : 'bg-white/3 border-white/8 text-gray-500 hover:border-white/20'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-2 block">
                Nivel de amenaza: <span className="text-white font-bold">{comp.threat}/10</span>
              </label>
              <input type="range" min="1" max="10" value={comp.threat}
                onChange={e => onUpdate(type, i, 'threat', parseInt(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer" />
              <div className="flex justify-between text-xs text-gray-600 mt-1">
                <span>Baja amenaza</span>
                <span>Alta amenaza</span>
              </div>
            </div>
          </div>
        </div>
      ))}

      {list.length < 10 && (
        <button type="button" onClick={() => onAdd(type)}
          className="w-full flex items-center justify-center gap-2 bg-white/3 hover:bg-white/5 border border-dashed border-white/15 hover:border-blue-500/30 text-gray-400 hover:text-blue-400 text-sm py-3 rounded-xl transition-all">
          <Plus size={16} />
          Agregar {type === 'direct' ? 'competidor directo' : 'competidor indirecto'} ({list.length}/10)
        </button>
      )}
    </div>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  // PASO 1
  const [companyName, setCompanyName] = useState('')
  const [website, setWebsite] = useState('')
  const [industry, setIndustry] = useState('')
  const [companySize, setCompanySize] = useState('')
  const [targetMarket, setTargetMarket] = useState('')
  const [industriesOfInterest, setIndustriesOfInterest] = useState<string[]>([])
  const [socialMedia, setSocialMedia] = useState({ ig: '', fb: '', tt: '', yt: '', lin: '', x: '' })
  const [mainProducts, setMainProducts] = useState('')

  // PASO 2
  const [valueProposition, setValueProposition] = useState('')
  const [products, setProducts] = useState([emptyProduct()])
  const [presenceRegional, setPresenceRegional] = useState(false)
  const [presenceNational, setPresenceNational] = useState(false)
  const [presenceInternational, setPresenceInternational] = useState(false)

  // PASO 3
  const [directCompetitors, setDirectCompetitors] = useState([emptyCompetitor()])

  // PASO 4
  const [indirectCompetitors, setIndirectCompetitors] = useState([emptyCompetitor()])

  // PASO 5
  const [monitorAreas, setMonitorAreas] = useState<string[]>([
    'PRICES', 'CAMPAIGNS', 'LAUNCHES', 'REGULATIONS', 'NEWS', 'SOCIAL', 'EXPANSION'
  ])

  // PASO 6
  const [frequency, setFrequency] = useState('WEEKLY')
  const [deliveryChannel, setDeliveryChannel] = useState('EMAIL')
  const [deliveryEmail, setDeliveryEmail] = useState('')
  const [deliveryPhone, setDeliveryPhone] = useState('')

  const addProduct = () => products.length < 10 && setProducts([...products, emptyProduct()])
  const removeProduct = (i: number) => setProducts(products.filter((_, idx) => idx !== i))
  const updateProduct = (i: number, field: 'name' | 'price', val: string) => {
    const u = [...products]; u[i] = { ...u[i], [field]: val }; setProducts(u)
  }

  const addCompetitor = (type: 'direct' | 'indirect') => {
    if (type === 'direct' && directCompetitors.length < 10)
      setDirectCompetitors([...directCompetitors, emptyCompetitor()])
    if (type === 'indirect' && indirectCompetitors.length < 10)
      setIndirectCompetitors([...indirectCompetitors, emptyCompetitor()])
  }

  const removeCompetitor = (type: 'direct' | 'indirect', i: number) => {
    if (type === 'direct') setDirectCompetitors(directCompetitors.filter((_, idx) => idx !== i))
    else setIndirectCompetitors(indirectCompetitors.filter((_, idx) => idx !== i))
  }

  const updateCompetitor = (type: 'direct' | 'indirect', i: number, field: string, val: any) => {
    if (type === 'direct') {
      setDirectCompetitors(directCompetitors.map((c, idx) => idx === i ? { ...c, [field]: val } : c))
    } else {
      setIndirectCompetitors(indirectCompetitors.map((c, idx) => idx === i ? { ...c, [field]: val } : c))
    }
  }

  const toggleArea = (area: string) => {
    setMonitorAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])
  }

  const toggleIndustry = (ind: string) => {
    setIndustriesOfInterest(prev => prev.includes(ind) ? prev.filter(a => a !== ind) : [...prev, ind])
  }

  // ✅ CONECTADO AL BACKEND
  const handleActivate = async () => {
    setLoading(true)
    setErrorMsg('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No hay sesión activa')

      const response = await fetch('http://localhost:3001/api/onboarding/competitive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.id,
          companyName, website, industry, companySize,
          targetMarket, mainProducts, socialMedia, industriesOfInterest,
          valueProposition, products, presenceRegional, presenceNational,
          presenceInternational, directCompetitors, indirectCompetitors,
          monitorAreas, frequency, deliveryChannel, deliveryEmail, deliveryPhone,
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al activar')

      router.push('/dashboard')
    } catch (error: any) {
      console.error(error)
      setErrorMsg(error.message || 'Error inesperado')
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#060609] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-600/8 rounded-full blur-3xl" />
      </div>

      <nav className="relative z-50 border-b border-white/5 backdrop-blur-xl bg-[#060609]/80">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-violet-600 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-black">Reports<span className="text-blue-400"> PRO</span></span>
          </Link>
          <div className="text-gray-500 text-sm">
            Paso <span className="text-white font-bold">{step}</span> de{' '}
            <span className="text-white font-bold">{STEPS.length}</span> ·{' '}
            <span className="text-blue-400 font-semibold">Inteligencia Competitiva</span>
          </div>
        </div>
      </nav>

      <div className="relative max-w-3xl mx-auto px-6 py-10">

        <div className="flex items-center justify-between mb-10 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-1 shrink-0">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs transition-all ${
                  step > s.id ? 'bg-green-500 text-white' :
                  step === s.id ? 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/30' :
                  'bg-white/5 border border-white/10 text-gray-600'
                }`}>
                  {step > s.id ? <CheckCircle size={14} /> : s.id}
                </div>
                <div className={`mt-1.5 text-[10px] font-medium whitespace-nowrap hidden md:block ${step === s.id ? 'text-white' : 'text-gray-600'}`}>{s.title}</div>
              </div>
              {i < STEPS.length - 1 && <div className={`w-6 h-px mx-1 ${step > s.id ? 'bg-green-500/50' : 'bg-white/8'}`} />}
            </div>
          ))}
        </div>

        <div className="relative bg-white/3 border border-white/8 rounded-3xl p-8 backdrop-blur-sm mb-6">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent rounded-t-3xl" />

          {/* PASO 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-blue-500/15 border border-blue-500/20 rounded-2xl flex items-center justify-center">
                  <Building2 size={22} className="text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Datos de tu empresa</h2>
                  <p className="text-gray-400 text-sm">Esta información personaliza todos tus reportes</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">Nombre de la empresa *</label>
                  <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                    placeholder="Grupo Industrial del Norte"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">Sitio web</label>
                  <input type="text" value={website} onChange={e => setWebsite(e.target.value)}
                    placeholder="www.tuempresa.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-2 block">Industria principal *</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {industries.slice(0, 12).map(ind => (
                    <button key={ind} type="button" onClick={() => setIndustry(ind)}
                      className={`text-xs py-2.5 px-3 rounded-xl border transition-all text-left ${industry === ind ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 font-semibold' : 'bg-white/3 border-white/8 text-gray-400 hover:border-white/20'}`}>
                      {ind}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-2 block">Tamaño de empresa</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['1-10', '11-50', '51-200', '200+'].map(s => (
                      <button key={s} type="button" onClick={() => setCompanySize(s)}
                        className={`text-xs py-2.5 px-3 rounded-xl border transition-all ${companySize === s ? 'bg-blue-600/30 border-blue-500/50 text-blue-300 font-semibold' : 'bg-white/3 border-white/8 text-gray-400 hover:border-white/20'}`}>
                        {s} empleados
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">Mercado objetivo</label>
                  <input type="text" value={targetMarket} onChange={e => setTargetMarket(e.target.value)}
                    placeholder="Ej: PyMEs en Nuevo León"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all" />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">Principales productos o servicios</label>
                <textarea value={mainProducts} onChange={e => setMainProducts(e.target.value)} rows={2}
                  placeholder="Ej: Empaque industrial, etiquetas adhesivas..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all resize-none" />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-3 block">Tus redes sociales</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { key: 'ig', label: '📸 Instagram', placeholder: '@tuempresa' },
                    { key: 'fb', label: '📘 Facebook', placeholder: 'facebook.com/...' },
                    { key: 'tt', label: '🎵 TikTok', placeholder: '@tuempresa' },
                    { key: 'yt', label: '▶️ YouTube', placeholder: 'Canal de YouTube' },
                    { key: 'lin', label: '💼 LinkedIn', placeholder: 'linkedin.com/company/...' },
                    { key: 'x', label: '✖️ X (Twitter)', placeholder: '@tuempresa' },
                  ].map(soc => (
                    <div key={soc.key}>
                      <label className="text-xs text-gray-500 mb-1 block">{soc.label}</label>
                      <input type="text" value={(socialMedia as any)[soc.key]}
                        onChange={e => setSocialMedia({ ...socialMedia, [soc.key]: e.target.value })}
                        placeholder={soc.placeholder}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-700 focus:outline-none focus:border-blue-500/50 transition-all" />
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-2 block">Industrias de interés a monitorear</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {industries.map(ind => (
                    <button key={ind} type="button" onClick={() => toggleIndustry(ind)}
                      className={`text-xs py-2 px-3 rounded-xl border transition-all text-left flex items-center gap-1.5 ${industriesOfInterest.includes(ind) ? 'bg-violet-600/25 border-violet-500/40 text-violet-300 font-semibold' : 'bg-white/3 border-white/8 text-gray-500 hover:border-white/20'}`}>
                      {industriesOfInterest.includes(ind) && <CheckCircle size={10} />}
                      {ind}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-violet-500/15 border border-violet-500/20 rounded-2xl flex items-center justify-center">
                  <TrendingUp size={22} className="text-violet-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Tu posicionamiento</h2>
                  <p className="text-gray-400 text-sm">¿Cómo se diferencia tu empresa en el mercado?</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-1.5 block">Propuesta de valor / Diferenciadores clave</label>
                <textarea value={valueProposition} onChange={e => setValueProposition(e.target.value)} rows={3}
                  placeholder="Ej: Somos los únicos en la región con certificación ISO 9001..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all resize-none" />
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-3 block">
                  Productos o servicios con precio aproximado
                  <span className="text-gray-600 ml-2">({products.length}/10)</span>
                </label>
                <div className="space-y-3">
                  {products.map((p, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-violet-500/15 border border-violet-500/20 rounded-lg flex items-center justify-center text-violet-400 text-xs font-black shrink-0">{i + 1}</div>
                      <input type="text" value={p.name} onChange={e => updateProduct(i, 'name', e.target.value)}
                        placeholder="Nombre del producto o servicio"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                      <div className="relative w-36 shrink-0">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                        <input type="number" value={p.price} onChange={e => updateProduct(i, 'price', e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 pl-7 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                      </div>
                      {products.length > 1 && (
                        <button type="button" onClick={() => removeProduct(i)}
                          className="w-8 h-8 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg flex items-center justify-center transition-all shrink-0">
                          <X size={13} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  ))}
                  {products.length < 10 && (
                    <button type="button" onClick={addProduct}
                      className="w-full flex items-center justify-center gap-2 bg-white/3 hover:bg-white/5 border border-dashed border-white/15 hover:border-violet-500/30 text-gray-400 hover:text-violet-400 text-sm py-3 rounded-xl transition-all">
                      <Plus size={16} /> Agregar producto o servicio
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-3 block">Presencia en mercados</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { key: 'regional', label: 'Regional', desc: 'Estado o región', set: setPresenceRegional, val: presenceRegional },
                    { key: 'national', label: 'Nacional', desc: 'Todo México', set: setPresenceNational, val: presenceNational },
                    { key: 'international', label: 'Internacional', desc: 'Otros países', set: setPresenceInternational, val: presenceInternational },
                  ].map(p => (
                    <button key={p.key} type="button" onClick={() => p.set(!p.val)}
                      className={`p-4 rounded-2xl border text-center transition-all ${p.val ? 'bg-violet-600/20 border-violet-500/50 shadow-lg shadow-violet-500/10' : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                      <div className={`text-sm font-bold mb-0.5 ${p.val ? 'text-violet-300' : 'text-gray-300'}`}>{p.label}</div>
                      <div className="text-xs text-gray-500">{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PASO 3 */}
          {step === 3 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-red-500/15 border border-red-500/20 rounded-2xl flex items-center justify-center">
                  <ShieldAlert size={22} className="text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Competidores directos</h2>
                  <p className="text-gray-400 text-sm">Empresas que ofrecen productos/servicios similares</p>
                </div>
              </div>
              <CompetitorForm type="direct" list={directCompetitors}
                onUpdate={updateCompetitor} onAdd={addCompetitor} onRemove={removeCompetitor} />
            </div>
          )}

          {/* PASO 4 */}
          {step === 4 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-amber-500/15 border border-amber-500/20 rounded-2xl flex items-center justify-center">
                  <Target size={22} className="text-amber-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Competidores indirectos</h2>
                  <p className="text-gray-400 text-sm">Empresas que satisfacen la misma necesidad de otra forma</p>
                </div>
              </div>
              <CompetitorForm type="indirect" list={indirectCompetitors}
                onUpdate={updateCompetitor} onAdd={addCompetitor} onRemove={removeCompetitor} />
            </div>
          )}

          {/* PASO 5 */}
          {step === 5 && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-cyan-500/15 border border-cyan-500/20 rounded-2xl flex items-center justify-center">
                  <BarChart2 size={22} className="text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Áreas a monitorear</h2>
                  <p className="text-gray-400 text-sm">El AI enfocará el reporte en los temas que selecciones</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {monitorOptions.map(opt => (
                  <button key={opt.value} type="button" onClick={() => toggleArea(opt.value)}
                    className={`flex items-center gap-3 p-4 rounded-2xl border text-left transition-all ${monitorAreas.includes(opt.value) ? 'bg-blue-600/20 border-blue-500/40 shadow-lg shadow-blue-500/10' : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${monitorAreas.includes(opt.value) ? 'bg-blue-500/20' : 'bg-white/5'}`}>
                      <opt.icon size={18} className={monitorAreas.includes(opt.value) ? 'text-blue-400' : 'text-gray-500'} />
                    </div>
                    <div className="flex-1">
                      <div className={`text-sm font-semibold ${monitorAreas.includes(opt.value) ? 'text-white' : 'text-gray-300'}`}>{opt.label}</div>
                    </div>
                    {monitorAreas.includes(opt.value) && <CheckCircle size={16} className="text-blue-400 shrink-0" />}
                  </button>
                ))}
              </div>
              <div className="mt-4 bg-blue-500/8 border border-blue-500/15 rounded-xl p-3 text-xs text-blue-300">
                💡 Seleccionadas: <span className="font-bold">{monitorAreas.length}</span> de {monitorOptions.length} áreas
              </div>
            </div>
          )}

          {/* PASO 6 */}
          {step === 6 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-500/15 border border-green-500/20 rounded-2xl flex items-center justify-center">
                  <Mail size={22} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Frecuencia y entrega</h2>
                  <p className="text-gray-400 text-sm">¿Cuándo y cómo quieres recibir tu reporte?</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-3 block">Frecuencia del reporte</label>
                <div className="grid grid-cols-2 gap-3">
                  {frequencies.map(f => (
                    <button key={f.value} type="button" onClick={() => setFrequency(f.value)}
                      className={`relative p-4 rounded-2xl border text-left transition-all ${frequency === f.value ? 'bg-green-600/20 border-green-500/50 shadow-lg shadow-green-500/10' : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                      {f.popular && <div className="absolute -top-2.5 left-3 bg-gradient-to-r from-blue-600 to-violet-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">Popular</div>}
                      <div className="font-black text-xl">{f.price}<span className="text-gray-500 text-xs font-normal">/mes</span></div>
                      <div className={`font-semibold text-sm ${frequency === f.value ? 'text-green-300' : 'text-gray-300'}`}>{f.label}</div>
                      <div className="text-gray-500 text-xs">{f.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 font-medium mb-3 block">Canal de entrega</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'EMAIL', label: 'Email', icon: Mail },
                    { value: 'WHATSAPP', label: 'WhatsApp', icon: Phone },
                    { value: 'BOTH', label: 'Ambos', icon: Users },
                  ].map(ch => (
                    <button key={ch.value} type="button" onClick={() => setDeliveryChannel(ch.value)}
                      className={`p-4 rounded-2xl border text-center transition-all ${deliveryChannel === ch.value ? 'bg-green-600/20 border-green-500/50' : 'bg-white/3 border-white/8 hover:border-white/20'}`}>
                      <ch.icon size={20} className={`mx-auto mb-2 ${deliveryChannel === ch.value ? 'text-green-400' : 'text-gray-500'}`} />
                      <div className={`text-sm font-semibold ${deliveryChannel === ch.value ? 'text-green-300' : 'text-gray-400'}`}>{ch.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {(deliveryChannel === 'EMAIL' || deliveryChannel === 'BOTH') && (
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">Email de entrega</label>
                  <div className="relative">
                    <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="email" value={deliveryEmail} onChange={e => setDeliveryEmail(e.target.value)}
                      placeholder="director@tuempresa.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-all" />
                  </div>
                </div>
              )}

              {(deliveryChannel === 'WHATSAPP' || deliveryChannel === 'BOTH') && (
                <div>
                  <label className="text-xs text-gray-400 font-medium mb-1.5 block">WhatsApp</label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="tel" value={deliveryPhone} onChange={e => setDeliveryPhone(e.target.value)}
                      placeholder="+52 81 1234 5678"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-green-500/50 transition-all" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PASO 7 */}
          {step === 7 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-green-500/15 border border-green-500/20 rounded-2xl flex items-center justify-center">
                  <CheckCircle size={22} className="text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-black">Confirma tu configuración</h2>
                  <p className="text-gray-400 text-sm">Revisa todo antes de activar tu módulo AI</p>
                </div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Empresa</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Nombre:</span> <span className="text-white font-medium">{companyName}</span></div>
                  <div><span className="text-gray-500">Industria:</span> <span className="text-white font-medium">{industry}</span></div>
                  <div><span className="text-gray-500">Tamaño:</span> <span className="text-white font-medium">{companySize} empleados</span></div>
                  <div><span className="text-gray-500">Web:</span> <span className="text-white font-medium">{website || '—'}</span></div>
                </div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Competidores directos</div>
                <div className="text-sm text-white">{directCompetitors.filter(c => c.name).length} competidores cargados</div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Competidores indirectos</div>
                <div className="text-sm text-white">{indirectCompetitors.filter(c => c.name).length} competidores cargados</div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Áreas monitoreadas</div>
                <div className="flex flex-wrap gap-2">
                  {monitorAreas.map(area => {
                    const opt = monitorOptions.find(o => o.value === area)
                    return opt ? (
                      <span key={area} className="bg-blue-500/15 border border-blue-500/20 text-blue-300 text-xs px-2.5 py-1 rounded-full">{opt.label}</span>
                    ) : null
                  })}
                </div>
              </div>

              <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
                <div className="text-xs text-gray-500 uppercase tracking-widest mb-3">Entrega</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-gray-500">Frecuencia:</span> <span className="text-white font-medium">{frequencies.find(f => f.value === frequency)?.label}</span></div>
                  <div><span className="text-gray-500">Precio:</span> <span className="text-white font-medium">{frequencies.find(f => f.value === frequency)?.price}/mes</span></div>
                  <div><span className="text-gray-500">Canal:</span> <span className="text-white font-medium">{deliveryChannel}</span></div>
                  {deliveryEmail && <div><span className="text-gray-500">Email:</span> <span className="text-white font-medium">{deliveryEmail}</span></div>}
                </div>
              </div>

              <div className="bg-gradient-to-r from-green-950/80 to-emerald-950/80 border border-green-500/25 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="font-bold text-green-300">7 días gratis incluidos</div>
                  <div className="text-gray-400 text-xs">Sin cargo hasta que termine tu prueba</div>
                </div>
                <div className="text-2xl font-black text-green-400">
                  {frequencies.find(f => f.value === frequency)?.price}
                  <span className="text-gray-500 text-sm font-normal">/mes</span>
                </div>
              </div>

              {errorMsg && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                  ⚠️ {errorMsg}
                </div>
              )}
            </div>
          )}
        </div>

        {/* NAVEGACIÓN */}
        <div className="flex items-center justify-between">
          <button type="button"
            onClick={() => step > 1 ? setStep(step - 1) : router.push('/dashboard')}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-4 py-2">
            <ArrowLeft size={16} />
            {step === 1 ? 'Cancelar' : 'Atrás'}
          </button>

          {step < 7 ? (
            <button type="button" onClick={() => setStep(step + 1)}
              disabled={step === 1 && (!companyName || !industry)}
              className="bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold px-8 py-3 rounded-xl transition-all hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2">
              Continuar <ArrowRight size={16} />
            </button>
          ) : (
            <button type="button" onClick={handleActivate} disabled={loading}
              className="bg-gradient-to-r from-green-600 to-emerald-500 text-white font-bold px-8 py-3 rounded-xl transition-all hover:shadow-lg hover:shadow-green-500/25 hover:scale-105 disabled:opacity-50 flex items-center gap-2">
              {loading
                ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><CheckCircle size={16} /> Activar módulo gratis</>
              }
            </button>
          )}
        </div>
      </div>
    </main>
  )
}