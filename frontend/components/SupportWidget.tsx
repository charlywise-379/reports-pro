'use client'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { MessageCircle, X, ArrowLeft, Send, Mail, Bot } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type ChatMessage = { role: 'user' | 'assistant'; content: string }
type PanelView = 'closed' | 'menu' | 'chat' | 'human'

const CHAT_STORAGE_KEY = 'omnireports_chat_history'
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

// Formateo ligero de markdown para las respuestas del Agente IA (Claude
// responde con **negritas**, encabezados ## / ### y listas -), sin traer una
// librería de markdown completa para un widget de chat pequeño. Solo se usa
// para mensajes del asistente — lo que escribe el usuario se muestra tal cual.
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={`${keyPrefix}-${i}`} className="font-bold text-white">{part.slice(2, -2)}</strong>
      : <span key={`${keyPrefix}-${i}`}>{part}</span>
  )
}

function renderMarkdownLite(content: string): ReactNode[] {
  const blocks: ReactNode[] = []
  let listItems: string[] = []

  const flushList = (key: string) => {
    if (listItems.length === 0) return
    blocks.push(
      <ul key={key} className="list-disc !pl-4 !my-1.5 !space-y-1">
        {listItems.map((item, i) => <li key={i}>{renderInline(item, `li-${key}-${i}`)}</li>)}
      </ul>
    )
    listItems = []
  }

  content.split('\n').forEach((rawLine, idx) => {
    const line = rawLine.trim()
    if (!line) { flushList(`l${idx}`); return }
    if (/^-{3,}$/.test(line)) { flushList(`l${idx}`); blocks.push(<hr key={`hr${idx}`} className="border-white/10 !my-2" />); return }
    const heading = line.match(/^#{1,3}\s+(.*)$/)
    if (heading) { flushList(`l${idx}`); blocks.push(<p key={`h${idx}`} className="font-bold text-white !mt-2 !mb-1 first:!mt-0">{renderInline(heading[1], `h${idx}`)}</p>); return }
    const bullet = line.match(/^[-•]\s+(.*)$/)
    if (bullet) { listItems.push(bullet[1]); return }
    flushList(`l${idx}`)
    blocks.push(<p key={`p${idx}`} className="!mb-1.5 last:!mb-0">{renderInline(line, `p${idx}`)}</p>)
  })
  flushList('l-end')
  return blocks
}

export default function SupportWidget() {
  const supabase = createClient()
  const [view, setView] = useState<PanelView>('closed')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [humanSubject, setHumanSubject] = useState('')
  const [humanMessage, setHumanMessage] = useState('')
  const [humanSent, setHumanSent] = useState(false)
  const [humanLoading, setHumanLoading] = useState(false)
  const [humanError, setHumanError] = useState('')
  const [account, setAccount] = useState<{ fullName: string; email: string } | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(CHAT_STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  }, [])

  useEffect(() => {
    if (view !== 'human' || account) return
    const loadAccount = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return
      try {
        const res = await fetch(`${BACKEND}/api/account/${session.user.id}`, {
          headers: { Authorization: 'Bearer ' + session.access_token },
        })
        const data = await res.json()
        if (res.ok && data.user) {
          setAccount({ fullName: data.user.fullName || '', email: data.user.email || '' })
        }
      } catch {}
    }
    loadAccount()
  }, [view, account])

  useEffect(() => {
    if (view === 'chat') messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, view])

  const persistMessages = (next: ChatMessage[]) => {
    setMessages(next)
    try { sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(next)) } catch {}
  }

  const getToken = async (): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  const handleSendChat = async () => {
    if (!input.trim() || loading) return
    const token = await getToken()
    if (!token) return
    const next = [...messages, { role: 'user' as const, content: input.trim() }]
    persistMessages(next)
    setInput('')
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`${BACKEND}/api/support/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ messages: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Ocurrió un error. Intenta de nuevo.')
        return
      }
      persistMessages([...next, { role: 'assistant' as const, content: data.reply }])
    } catch {
      setError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleSendHuman = async () => {
    if (!humanSubject.trim() || !humanMessage.trim() || humanLoading) return
    const token = await getToken()
    if (!token) return
    setHumanLoading(true)
    setHumanError('')
    try {
      const res = await fetch(`${BACKEND}/api/support/contact-human`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ subject: humanSubject.trim(), message: humanMessage.trim(), chatContext: messages.slice(-6) }),
      })
      const data = await res.json()
      if (!res.ok) {
        setHumanError(data.error || 'Ocurrió un error. Intenta de nuevo.')
        return
      }
      setHumanSent(true)
    } catch {
      setHumanError('Ocurrió un error. Intenta de nuevo.')
    } finally {
      setHumanLoading(false)
    }
  }

  return (
    <>
      {view === 'closed' && (
        <button
          onClick={() => setView('menu')}
          aria-label="Abrir soporte"
          className="fixed bottom-6 right-6 z-[90] flex items-center justify-center"
        >
          <span className="absolute inset-0 rounded-full bg-blue-600/50 animate-ping" />
          <span className="relative w-14 h-14 rounded-full bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg flex items-center justify-center text-white">
            <MessageCircle size={24} />
          </span>
        </button>
      )}

      {view !== 'closed' && (
        <div
          className="fixed bottom-6 right-6 z-[90] w-full max-w-sm bg-[#0E0E16] border border-white/10 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          style={{ height: view === 'chat' ? 520 : 'auto', maxHeight: 'calc(100vh - 96px)' }}
        >
          <div className="flex items-center justify-between !px-5 !py-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-2">
              {view !== 'menu' && (
                <button onClick={() => setView('menu')} className="text-gray-400 hover:text-white" aria-label="Volver">
                  <ArrowLeft size={16} />
                </button>
              )}
              <span className="font-bold text-sm text-white">
                {view === 'menu' && 'Centro de ayuda'}
                {view === 'chat' && 'Agente IA'}
                {view === 'human' && 'Agente Humano'}
              </span>
            </div>
            <button onClick={() => setView('closed')} className="text-gray-400 hover:text-white" aria-label="Cerrar">
              <X size={18} />
            </button>
          </div>

          {view === 'menu' && (
            <div className="!p-4 flex flex-col gap-3">
              <button
                onClick={() => setView('chat')}
                className="flex items-center gap-3 !p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
              >
                <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-white" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">Agente IA</span>
                  <span className="block text-xs text-gray-400">Respuestas de inmediato</span>
                </span>
              </button>
              <button
                onClick={() => setView('human')}
                className="flex items-center gap-3 !p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-left"
              >
                <span className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Mail size={18} className="text-white" />
                </span>
                <span>
                  <span className="block text-sm font-bold text-white">Agente Humano</span>
                  <span className="block text-xs text-gray-400">Te respondemos por correo</span>
                </span>
              </button>
            </div>
          )}

          {view === 'chat' && (
            <>
              <div className="flex-1 overflow-y-auto !p-4 flex flex-col gap-3">
                {messages.length === 0 && (
                  <p className="text-xs text-gray-500 text-center !mt-4">
                    Pregúntame sobre cómo funciona Omni Reports, tu prueba gratuita, planes o reportes.
                  </p>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl !px-4 !py-2.5 text-sm ${
                        m.role === 'user'
                          ? 'bg-gradient-to-r from-blue-600 to-violet-600 text-white'
                          : 'bg-white/5 border border-white/10 text-gray-200'
                      }`}
                    >
                      {m.role === 'assistant' ? renderMarkdownLite(m.content) : m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-2xl !px-4 !py-2.5 text-sm text-gray-400">
                      Escribiendo...
                    </div>
                  </div>
                )}
                {error && <p className="text-xs text-red-400 text-center">{error}</p>}
                <div ref={messagesEndRef} />
              </div>
              <div className="border-t border-white/10 !p-3 flex items-center gap-2 flex-shrink-0">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                  placeholder="Escribe tu pregunta..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl !px-3 !py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                />
                <button
                  onClick={handleSendChat}
                  disabled={!input.trim() || loading}
                  className="bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-xl !p-2.5 disabled:opacity-50 flex items-center justify-center flex-shrink-0"
                  aria-label="Enviar"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}

          {view === 'human' && (
            <div className="!p-4 overflow-y-auto">
              {humanSent ? (
                <p className="text-sm text-gray-300 text-center !py-6">
                  Listo, recibimos tu mensaje. Te respondemos a tu correo registrado en menos de 1 hora en horario laboral.
                </p>
              ) : (
                <>
                  <div className="!mb-3">
                    <label className="block text-xs text-gray-500 !mb-1">Nombre completo</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl !px-3 !py-2.5 text-sm text-gray-400">
                      {account?.fullName || '—'}
                    </div>
                  </div>
                  <div className="!mb-3">
                    <label className="block text-xs text-gray-500 !mb-1">Correo</label>
                    <div className="w-full bg-white/5 border border-white/10 rounded-xl !px-3 !py-2.5 text-sm text-gray-400">
                      {account?.email || '—'}
                    </div>
                  </div>
                  <div className="!mb-3">
                    <label className="block text-xs text-gray-500 !mb-1">Asunto</label>
                    <input
                      type="text"
                      value={humanSubject}
                      onChange={e => setHumanSubject(e.target.value)}
                      placeholder="¿Sobre qué quieres hablar?"
                      className="w-full bg-white/5 border border-white/10 rounded-xl !px-3 !py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50"
                    />
                  </div>
                  <div className="!mb-3">
                    <label className="block text-xs text-gray-500 !mb-1">Mensaje</label>
                    <textarea
                      value={humanMessage}
                      onChange={e => setHumanMessage(e.target.value)}
                      placeholder="Cuéntanos en qué podemos ayudarte..."
                      rows={4}
                      className="w-full bg-white/5 border border-white/10 rounded-xl !px-3 !py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500/50 resize-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 !mb-3">
                    Esta información se enviará al equipo de soporte de Omni Reports. Recibirás una respuesta en menos de 1 hora, en horario laboral.
                  </p>
                  {humanError && <p className="text-xs text-red-400 !mb-3">{humanError}</p>}
                  <button
                    onClick={handleSendHuman}
                    disabled={!humanSubject.trim() || !humanMessage.trim() || humanLoading}
                    className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-white font-bold !py-3 rounded-xl disabled:opacity-50"
                  >
                    {humanLoading ? 'Enviando...' : 'Enviar mensaje'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
