'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/operations/api'
import { getStoredTheme, palette } from '@/lib/operations/theme'

type SubRow = {
  id: string; status: string; frequency: string; pricePerMonth: number; trialEndsAt: string
  user: { email: string }; project: { name: string; serviceType: string }
}

export default function OperationsSubscriptionsPage() {
  const [subs, setSubs] = useState<SubRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const T = palette[getStoredTheme()]

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '25' })
    if (status) params.set('status', status)
    adminFetch(`/api/operations/subscriptions?${params}`)
      .then(res => res.json())
      .then(data => { setSubs(data.subscriptions); setTotal(data.total) })
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Suscripciones</h1>
        <button onClick={handleExport} style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          Exportar CSV
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

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
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
                <td style={{ padding: '10px 14px' }}>{s.user.email}</td>
                <td style={{ padding: '10px 14px' }}>{s.project.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: T.textMuted }}>{s.project.serviceType}</td>
                <td style={{ padding: '10px 14px' }}>{s.frequency}</td>
                <td style={{ padding: '10px 14px' }}>${s.pricePerMonth.toFixed(2)}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 11 }}>{s.status}</td>
                <td style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                  <button onClick={() => handleExtendTrial(s.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, cursor: 'pointer' }}>Extender trial</button>
                  {s.status !== 'CANCELLED' && (
                    <button onClick={() => handleCancel(s.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.danger}`, borderRadius: 6, padding: '4px 8px', color: T.danger, cursor: 'pointer' }}>Cancelar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: T.textMuted }}>
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
