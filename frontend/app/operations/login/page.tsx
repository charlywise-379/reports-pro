'use client'
import { useState } from 'react'
import { Mail, Lock, ArrowRight } from 'lucide-react'
import { adminFetch } from '@/lib/operations/api'

export default function OperationsLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await adminFetch('/api/operations/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      })
      if (res.ok) {
        // Navegacion de pagina completa (no router.push) — asegura que la cookie
        // recien seteada este disponible desde el primer render del nuevo documento.
        // router.push (navegacion SPA) podia montar el dashboard antes de que el
        // navegador confirmara la cookie, dejando AdminContext sin sesion detectada
        // hasta un refresh manual.
        window.location.href = '/operations'
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Error al iniciar sesión')
        setLoading(false)
      }
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.')
      setLoading(false)
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
          <div className="flex items-center justify-center mb-8">
            <img src="/logo-full.png" alt="Omni Reports" className="h-16 w-auto" />
          </div>
          <h1 className="text-2xl font-black mb-2">Panel de Operaciones</h1>
          <p className="text-gray-400 text-sm">Acceso restringido para administradores</p>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} className="bg-white/3 border border-white/8 rounded-3xl p-8 backdrop-blur-sm">
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
                  placeholder="tu@omnireports.pro"
                  required
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
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pl-10 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-white/8 transition-all"
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
              type="submit"
              disabled={loading || !email || !password}
              className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-blue-500/25 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={16} />
                </>
              )}
            </button>

          </div>
        </form>

      </div>
    </main>
  )
}
