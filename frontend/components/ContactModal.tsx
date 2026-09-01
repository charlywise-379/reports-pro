'use client'
import { useState } from 'react'
import { X, Send, CheckCircle, Mail } from 'lucide-react'

export default function ContactModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const canSubmit = name.trim() && email.trim() && message.trim() && !loading

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    setError('')
    try {
      const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'
      const res = await fetch(`${BACKEND}/api/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const result = await res.json()
      if (!res.ok) {
        setError(result.error || 'Ocurrió un error. Intenta de nuevo.')
        setLoading(false)
        return
      }
      setSuccess(true)
    } catch (e) {
      setError('Ocurrió un error. Intenta de nuevo.')
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full max-w-md bg-[#0B0B12] border border-white/10 rounded-3xl p-8"
      >
        <button
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute top-5 right-5 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {success ? (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={30} className="text-white" />
            </div>
            <h2 className="text-xl font-black mb-2">Mensaje enviado</h2>
            <p className="text-gray-400 text-sm">Gracias por escribirnos, te responderemos a la brevedad.</p>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl flex items-center justify-center mb-5">
              <Mail size={20} className="text-white" />
            </div>
            <h2 className="text-xl font-black mb-1">Contáctanos</h2>
            <p className="text-gray-400 text-sm mb-6">Escríbenos y te responderemos a la brevedad.</p>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Nombre</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="tu@empresa.com"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 font-medium mb-1.5 block">Mensaje</label>
                <textarea
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder="¿En qué podemos ayudarte?"
                  rows={4}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 transition-all resize-none"
                />
              </div>
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Enviar mensaje<Send size={16} /></>
                )}
              </button>
              <p className="text-gray-600 text-xs text-center">También puedes escribirnos directo a info@omnireports.pro</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
