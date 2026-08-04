'use client'
import { useEffect, useState } from 'react'
import { Download, Clock, CheckCircle, AlertTriangle, XCircle, AlertCircle, RotateCw, Ban } from 'lucide-react'
import { adminFetch } from '@/lib/operations/api'
import { palette } from '@/lib/operations/theme'
import { useTheme } from '@/lib/operations/ThemeContext'
import { StatusBadge, Avatar } from '@/lib/operations/StatusBadge'

type SubRow = {
  id: string; status: string; frequency: string; pricePerMonth: number; trialEndsAt: string
  user: { email: string }; project: { name: string; serviceType: string }
}

const actionBtn = (T: any, danger?: boolean): React.CSSProperties => ({
  display: 'inline-flex', alignItems: 'center', gap: 5,
  fontSize: 11, fontWeight: 600, background: 'none',
  border: `1px solid ${danger ? T.danger : T.border}`, borderRadius: 6,
  padding: '5px 9px', color: danger ? T.danger : T.text, cursor: 'pointer',
})

function SubStatusBadge({ status, T }: { status: string; T: any }) {
  const map: Record<string, { label: string; color: string; icon: any }> = {
    TRIALING: { label: 'Trial', color: T.warning, icon: Clock },
    ACTIVE: { label: 'Activa', color: T.success, icon: CheckCircle },
    PAST_DUE: { label: 'Pago vencido', color: T.warning, icon: AlertTriangle },
    CANCELLED: { label: 'Cancelada', color: T.danger, icon: XCircle },
    UNPAID: { label: 'Sin pagar', color: T.danger, icon: AlertCircle },
  }
  const s = map[status] || { label: status, color: T.textMuted, icon: AlertCircle }
  return <StatusBadge label={s.label} color={s.color} icon={s.icon} />
}

export default function OperationsSubscriptionsPage() {
  const [subs, setSubs] = useState<SubRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { theme } = useTheme()
  const T = palette[theme]

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '25' })
    if (status) params.set('status', status)
    adminFetch(`/api/operations/subscriptions?${params}`)
      .then(res => res.ok ? res.json() : { subscriptions: [], total: 0 })
      .then(data => { setSubs(data.subscriptions || []); setTotal(data.total || 0) })
  }

  useEffect(() => { load() }, [page, status])

  const handleCancel = async (id: string) => {
    if (!confirm('¿Cancelar esta suscripción?')) return
    await adminFetch(`/api/operations/subscriptions/${id}/cancel`, { method: 'POST' })
    load()
  }

  const handleExtendTrial = async (id: string) => {
    const days = prompt('¿Cuántos días extender el trial?', '7')
    if (!days) return
    await adminFetch(`/api/operations/subscriptions/${id}/extend-trial`, { method: 'POST', body: JSON.stringify({ days: parseInt(days) }) })
    load()
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/operations/subscriptions/export?${params}`, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Suscripciones</h1>
        <button onClick={handleExport} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.accent, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          <Download size={13} /> Exportar CSV
        </button>
      </div>

      <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
        style={{ padding: '8px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, marginBottom: 16 }}>
        <option value="">Todos los estados</option>
        <option value="TRIALING">Trial</option>
        <option value="ACTIVE">Activa</option>
        <option value="PAST_DUE">Pago vencido</option>
        <option value="CANCELLED">Cancelada</option>
        <option value="UNPAID">Sin pagar</option>
      </select>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 700 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
              {['Usuario', 'Proyecto', 'Módulo', 'Frecuencia', 'Precio', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: T.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Avatar name={s.user.email} T={T} />
                    <span style={{ fontSize: 12 }}>{s.user.email}</span>
                  </div>
                </td>
                <td style={{ padding: '10px 14px' }}>{s.project.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: T.textMuted }}>{s.project.serviceType}</td>
                <td style={{ padding: '10px 14px' }}>{s.frequency}</td>
                <td style={{ padding: '10px 14px' }}>${s.pricePerMonth.toFixed(2)}</td>
                <td style={{ padding: '10px 14px' }}><SubStatusBadge status={s.status} T={T} /></td>
                <td style={{ padding: '10px 14px' }}>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => handleExtendTrial(s.id)} style={actionBtn(T)}><RotateCw size={11} /> Extender trial</button>
                    {s.status !== 'CANCELLED' && (
                      <button onClick={() => handleCancel(s.id)} style={actionBtn(T, true)}><Ban size={11} /> Cancelar</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: T.textMuted, flexWrap: 'wrap', gap: 8 }}>
        <span>{total} suscripciones en total</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', color: T.text, cursor: 'pointer' }}>Anterior</button>
          <span>Página {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 25 >= total} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', color: T.text, cursor: 'pointer' }}>Siguiente</button>
        </div>
      </div>
    </div>
  )
}
