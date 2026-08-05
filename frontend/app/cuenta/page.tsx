'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

const STATUS_COLORS: Record<string, string> = {
  TRIALING: '#3B82F6', ACTIVE: '#10B981', PAST_DUE: '#F59E0B',
  CANCELLED: '#EF4444', UNPAID: '#EF4444',
  QUEUED: '#6B7280', GENERATING: '#3B82F6', COMPLETED: '#10B981', FAILED: '#EF4444',
}

function Avatar({ name, accent }: { name: string; accent: string }) {
  const initials = (name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
  return (
    <div style={{
      width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
      background: `${accent}25`, color: accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 20, fontWeight: 800,
    }}>
      {initials}
    </div>
  )
}

function StatusPill({ label, status }: { label: string; status: string }) {
  const color = STATUS_COLORS[status] || '#6B7280'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, color,
      background: `${color}1A`, border: `1px solid ${color}40`, borderRadius: 20, padding: '3px 9px',
    }}>
      {label}
    </span>
  )
}

export default function CuentaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState('')
  const [accountData, setAccountData] = useState<any>(null)
  const [invoices, setInvoices] = useState<any[]>([])
  const [invoicesError, setInvoicesError] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [country, setCountry] = useState('')
  const [isDark, setIsDark] = useState(true)
  const isMobile = useIsMobile()
  const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://reports-pro-production.up.railway.app'

  useEffect(() => {
    const saved = localStorage.getItem('theme')
    if (saved) setIsDark(saved === 'dark')
  }, [])

  const T = isDark ? {
    bg: '#0D0F1A', bgCard: 'rgba(255,255,255,0.03)', bgCard2: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.07)', border2: 'rgba(255,255,255,0.1)',
    text: '#F0F2FF', textMuted: '#5A627A', textSub: '#9CA3AF',
    navBg: '#0D0F1A', navBorder: 'rgba(255,255,255,0.06)',
    lbl: '#5A627A', inputBg: 'rgba(255,255,255,0.04)', accent: '#3B82F6',
  } : {
    bg: '#EEEDFE', bgCard: '#FFFFFF', bgCard2: '#F0EEFF',
    border: '#CECBF6', border2: '#AFA9EC',
    text: '#26215C', textMuted: '#7F77DD', textSub: '#534AB7',
    navBg: '#26215C', navBorder: '#3C3489',
    lbl: '#534AB7', inputBg: '#F0EEFF', accent: '#534AB7',
  }

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }
      setUserId(session.user.id)
      setToken(session.access_token)

      const res = await fetch(`${BACKEND}/api/account/${session.user.id}`, {
        headers: { Authorization: 'Bearer ' + session.access_token },
      })
      if (res.ok) {
        const data = await res.json()
        setAccountData(data)
        const parts = (data.user.fullName || '').trim().split(/\s+/)
        setFirstName(parts[0] || '')
        setLastName(parts.slice(1).join(' ') || '')
        setPhone(data.user.phone || '')
        setCompany(data.user.company || '')
        setCity(data.user.city || '')
        setState(data.user.state || '')
        setCountry(data.user.country || '')
      }

      const invRes = await fetch(`${BACKEND}/api/account/${session.user.id}/invoices`, {
        headers: { Authorization: 'Bearer ' + session.access_token },
      })
      if (invRes.ok) {
        const invData = await invRes.json()
        setInvoices(invData.invoices || [])
        setInvoicesError(!!invData.error)
      }

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaveMsg('')
    try {
      const res = await fetch(`${BACKEND}/api/account/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ firstName, lastName, phone, company, city, state, country }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSaveMsg(data.error || 'Ocurrió un error al guardar.')
        setSaving(false)
        return
      }
      setAccountData((prev: any) => ({ ...prev, user: data.user }))
      setSaveMsg('Cambios guardados.')
    } catch {
      setSaveMsg('Ocurrió un error al guardar.')
    }
    setSaving(false)
  }

  const handleManageSubscription = async () => {
    const res = await fetch(`${BACKEND}/api/stripe/portal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif' }}>
        Cargando...
      </main>
    )
  }

  const fullName = accountData?.user?.fullName || ''
  const email = accountData?.user?.email || ''
  const subscriptions = accountData?.subscriptions || []
  const reports = accountData?.reports || []
  const reportsByProject = reports.reduce((acc: Record<string, any[]>, r: any) => {
    const key = `${r.projectName} — ${r.serviceType}`
    acc[key] = acc[key] || []
    acc[key].push(r)
    return acc
  }, {})

  const inputStyle: React.CSSProperties = {
    width: '100%', background: T.inputBg, border: `1px solid ${T.border}`, borderRadius: 10,
    padding: '10px 12px', fontSize: 13, color: T.text, outline: 'none',
  }
  const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: T.lbl, display: 'block', marginBottom: 6 }
  const cardStyle: React.CSSProperties = { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 14, padding: 20, marginBottom: 20 }

  return (
    <main style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <nav style={{ borderBottom: `1px solid ${T.navBorder}`, background: T.navBg, position: 'sticky', top: 0, zIndex: 50, padding: isMobile ? '10px 16px' : '0 28px', height: isMobile ? 'auto' : 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={isDark ? '/logo-full.png' : '/logo-full-dark.png'} alt="Omni Reports" style={{ height: isMobile ? 28 : 34, width: 'auto' }} />
        <Link href="/dashboard" style={{ fontSize: 11, color: isDark ? T.textMuted : '#AFA9EC', fontWeight: 600, textDecoration: 'none' }}>
          ← Volver al dashboard
        </Link>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '16px 16px 60px' : '28px 28px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar name={fullName} accent={T.accent} />
          <div>
            <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{fullName || email}</h1>
            <div style={{ fontSize: 12, color: T.textMuted }}>{email}</div>
          </div>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Datos de contacto</h2>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Nombre</label>
              <input style={inputStyle} value={firstName} onChange={e => setFirstName(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Apellido</label>
              <input style={inputStyle} value={lastName} onChange={e => setLastName(e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email</label>
            <input style={{ ...inputStyle, opacity: 0.6 }} value={email} disabled />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Teléfono</label>
              <input style={inputStyle} value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Empresa</label>
              <input style={inputStyle} value={company} onChange={e => setCompany(e.target.value)} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div>
              <label style={labelStyle}>Ciudad</label>
              <input style={inputStyle} value={city} onChange={e => setCity(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <input style={inputStyle} value={state} onChange={e => setState(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>País</label>
              <input style={inputStyle} value={country} onChange={e => setCountry(e.target.value)} />
            </div>
          </div>
          {saveMsg && <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 12 }}>{saveMsg}</div>}
          <button onClick={handleSave} disabled={saving} style={{
            background: T.accent, color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saving ? 0.6 : 1,
          }}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Mis suscripciones</h2>
          {subscriptions.length === 0 && <div style={{ fontSize: 12, color: T.textMuted }}>Aún no tienes suscripciones activas.</div>}
          {subscriptions.map((s: any) => (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{s.projectName}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{s.frequency} · ${s.pricePerMonth}/mes</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <StatusPill label={s.status} status={s.status} />
                <button onClick={handleManageSubscription} style={{
                  background: 'transparent', border: `1px solid ${T.border2}`, color: T.text,
                  borderRadius: 8, padding: '6px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}>
                  Gestionar suscripción
                </button>
              </div>
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Historial de pagos</h2>
          {invoicesError && <div style={{ fontSize: 12, color: T.textMuted }}>No se pudo cargar el historial de pagos, intenta más tarde.</div>}
          {!invoicesError && invoices.length === 0 && <div style={{ fontSize: 12, color: T.textMuted }}>Aún no tienes pagos registrados.</div>}
          {invoices.map((inv: any) => (
            <div key={inv.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{new Date(inv.date).toLocaleDateString('es-MX')}</div>
                <div style={{ fontSize: 11, color: T.textMuted }}>{inv.amountFormatted} · {inv.status}</div>
              </div>
              {inv.hostedInvoiceUrl && (
                <a href={inv.hostedInvoiceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: T.accent, textDecoration: 'none' }}>
                  Ver factura →
                </a>
              )}
            </div>
          ))}
        </div>

        <div style={cardStyle}>
          <h2 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16 }}>Mis reportes</h2>
          {reports.length === 0 && <div style={{ fontSize: 12, color: T.textMuted }}>Aún no tienes reportes generados.</div>}
          {Object.entries(reportsByProject).map(([groupName, groupReports]) => (
            <div key={groupName} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.textMuted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{groupName}</div>
              {(groupReports as any[]).map((r: any) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${T.border}`, flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{r.reportTitle || 'Reporte'}</div>
                    <div style={{ fontSize: 11, color: T.textMuted }}>{new Date(r.createdAt).toLocaleDateString('es-MX')}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <StatusPill label={r.status} status={r.status} />
                    {r.status === 'COMPLETED' && r.r2Url && (
                      <a href={r.r2Url} target="_blank" rel="noreferrer" style={{ fontSize: 11, fontWeight: 700, color: T.accent, textDecoration: 'none' }}>
                        Descargar →
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
