'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Mail, Lock, User, Phone, Building2, MapPin, ArrowRight, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react'
import posthog from 'posthog-js'

export default function RegisterPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const canAdvanceToStep2 = email.trim() && password.length >= 6

  const handleAdvance = () => {
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    setError('')
    setStep(2)
  }

  const handleRegister = async () => {
    if (!firstName.trim()) {
      setError('El nombre es requerido')
      return
    }
    if (!lastName.trim()) {
      setError('El apellido es requerido')
      return
    }
    if (!acceptedTerms) {
      setError('Debes aceptar el Aviso de Privacidad y los Términos y Condiciones')
      return
    }
    setLoading(true)
    setError('')
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'
      const res = await fetch(`${BACKEND}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password, phone, company, city, state, country, acceptedTerms: true }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Ocurrió un error. Intenta de nuevo.')
        posthog.captureException(new Error(result.error || 'register_failed'), { email })
        setLoading(false)
        return
      }
      posthog.capture('user_signed_up', { email, name: `${firstName} ${lastName}` })
      setSuccess(true)
    } catch (e) {
      setError('Ocurrió un error. Intenta de nuevo.')
      setLoading(false)
    }
  }

  if (success) {
    return (
      <main className="min-h-screen bg-[#060609] text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={36} className="text-white" />
          </div>
          <h1 className="text-3xl font-black mb-3">Revisa tu email</h1>
          <p className="text-gray-400 mb-6">Te enviamos un link de confirmación a <span className="text-white font-semibold">{email}</span>.</p>
          <Link href="/login" className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-semibold transition-colors">
            Ir a iniciar sesión <ArrowRight size={16} />
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
        <div className="text-center mb-8">
          <Link href="/" className="flex items-center justify-center mb-8">
            <img src="/logo-full.png" alt="Omni Reports" className="h-16 w-auto" />
          </Link>
          <div className="inline-flex items-center gap-2 bg-green-500/15 border border-green-500/25 text-green-400 text-xs font-bold px-3 py-1.5 rounded-full mb-4">
            <Sparkles size={12} />
            7 días gratis · Sin tarjeta de crédito
          </div>
          <h1 className="text-2xl font-black mb-2">Crea tu cuenta gratis</h1>
          <p className="text-gray-400 text-sm">Tu primer reporte AI en menos de 5 minutos</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-6">
          <div className={`h-1.5 w-10 rounded-full ${step >= 1 ? 'bg-blue-500' : 'bg-white/10'}`} />
          <div className={`h-1.5 w-10 rounded-full ${step >= 2 ? 'bg-blue-500' : 'bg-white/10'}`} />
        </div>

        <div className="relative bg-white/3 border border-white/8 rounded-3xl p-8 backdrop-blur-sm">
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Email empresarial</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="carlos@empresa.com"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres"
                    onKeyDown={e => e.key === 'Enter' && canAdvanceToStep2 && handleAdvance()}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <button onClick={handleAdvance} disabled={!canAdvanceToStep2}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                Continuar<ArrowRight size={16} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 font-medium mb-1.5 block">Nombre</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Carlos"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 font-medium mb-1.5 block">Apellido</label>
                  <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Mendoza"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Teléfono (opcional)</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+52 55 1234 5678"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Empresa (opcional)</label>
                <div className="relative">
                  <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input type="text" value={company} onChange={e => setCompany(e.target.value)} placeholder="Mi Empresa S.A."
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-400 font-medium mb-1.5 block">Ciudad (opcional)</label>
                  <div className="relative">
                    <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input type="text" value={city} onChange={e => setCity(e.target.value)} placeholder="Ciudad de México"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400 font-medium mb-1.5 block">Estado (opcional)</label>
                  <input type="text" value={state} onChange={e => setState(e.target.value)} placeholder="CDMX"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
                </div>
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">País (opcional)</label>
                <input type="text" value={country} onChange={e => setCountry(e.target.value)} placeholder="México"
                  onKeyDown={e => e.key === 'Enter' && firstName.trim() && lastName.trim() && handleRegister()}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all" />
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 bg-white/5 accent-blue-600 flex-shrink-0" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  He leído y acepto el{' '}
                  <Link href="/legal/aviso-de-privacidad" target="_blank" className="text-blue-400 hover:text-blue-300 underline">Aviso de Privacidad</Link>
                  {' '}y los{' '}
                  <Link href="/legal/terminos-y-condiciones" target="_blank" className="text-blue-400 hover:text-blue-300 underline">Términos y Condiciones</Link>
                  , incluyendo la política de no reembolso.
                </span>
              </label>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <div className="flex gap-3">
                <button onClick={() => { setError(''); setStep(1) }} type="button"
                  className="flex-shrink-0 bg-white/5 border border-white/10 text-white font-bold py-3.5 px-4 rounded-xl transition-all hover:bg-white/10 flex items-center justify-center gap-2">
                  <ArrowLeft size={16} />
                </button>
                <button onClick={handleRegister} disabled={loading || !firstName.trim() || !lastName.trim() || !acceptedTerms}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Sparkles size={16} />Crear cuenta y comenzar gratis<ArrowRight size={16} /></>}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-gray-500">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Iniciar sesión</Link>
          </div>
        </div>
        <div className="flex items-center justify-center gap-6 mt-6 text-xs text-gray-600">
          <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" />Sin tarjeta requerida</div>
          <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" />7 días gratis</div>
          <div className="flex items-center gap-1.5"><CheckCircle size={12} className="text-green-500" />Cancela cuando quieras</div>
        </div>
      </div>
    </main>
  )
}
