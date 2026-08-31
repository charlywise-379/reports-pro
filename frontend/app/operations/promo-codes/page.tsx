'use client'
import { useEffect, useState } from 'react'
import { CheckCircle, XCircle } from 'lucide-react'
import { adminFetch } from '@/lib/operations/api'
import { palette } from '@/lib/operations/theme'
import { useTheme } from '@/lib/operations/ThemeContext'
import { StatusBadge } from '@/lib/operations/StatusBadge'

type PromoCodeRow = {
  id: string
  code: string
  trialDays: number
  maxRedemptions: number
  redemptionCount: number
  active: boolean
  expiresAt: string | null
  createdAt: string
  createdByAdminName: string
}

export default function OperationsPromoCodesPage() {
  const [codes, setCodes] = useState<PromoCodeRow[]>([])
  const [newCode, setNewCode] = useState('')
  const [newMaxRedemptions, setNewMaxRedemptions] = useState('1')
  const [creating, setCreating] = useState(false)
  const { theme } = useTheme()
  const T = palette[theme]

  const load = () => {
    adminFetch('/api/operations/promo-codes')
      .then(res => res.ok ? res.json() : { codes: [] })
      .then(data => setCodes(data.codes || []))
  }

  useEffect(() => { load() }, [])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const res = await adminFetch('/api/operations/promo-codes', {
        method: 'POST',
        body: JSON.stringify({
          code: newCode.trim() || undefined,
          maxRedemptions: Number(newMaxRedemptions) || 1,
        }),
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Error al crear el codigo'); return }
      setNewCode('')
      setNewMaxRedemptions('1')
      load()
    } finally {
      setCreating(false)
    }
  }

  const handleToggle = async (id: string) => {
    await adminFetch(`/api/operations/promo-codes/${id}/toggle`, { method: 'PATCH' })
    load()
  }

  return (
    <div style={{ padding: 24, color: T.text }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20 }}>Códigos Promocionales</h1>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 24, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: 14 }}>
        <input
          value={newCode}
          onChange={e => setNewCode(e.target.value)}
          placeholder="Código (vacío = autogenerado)"
          style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontSize: 13 }}
        />
        <input
          type="number"
          min={1}
          value={newMaxRedemptions}
          onChange={e => setNewMaxRedemptions(e.target.value)}
          placeholder="Máx. canjes"
          style={{ padding: '6px 10px', borderRadius: 6, border: `1px solid ${T.border}`, background: 'transparent', color: T.text, fontSize: 13, width: 100 }}
        />
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', background: T.accent, color: '#fff', fontSize: 13, fontWeight: 600, cursor: creating ? 'not-allowed' : 'pointer' }}
        >
          {creating ? 'Creando...' : 'Crear código'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
            <th style={{ padding: '8px 10px' }}>Código</th>
            <th style={{ padding: '8px 10px' }}>Canjes</th>
            <th style={{ padding: '8px 10px' }}>Estado</th>
            <th style={{ padding: '8px 10px' }}>Creado por</th>
            <th style={{ padding: '8px 10px' }}>Fecha</th>
            <th style={{ padding: '8px 10px' }}></th>
          </tr>
        </thead>
        <tbody>
          {codes.map(c => (
            <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}` }}>
              <td style={{ padding: '10px' }}><code>{c.code}</code></td>
              <td style={{ padding: '10px' }}>{c.redemptionCount} / {c.maxRedemptions}</td>
              <td style={{ padding: '10px' }}>
                <StatusBadge
                  label={c.active ? 'Activo' : 'Inactivo'}
                  color={c.active ? '#1D9E75' : '#888'}
                  icon={c.active ? CheckCircle : XCircle}
                />
              </td>
              <td style={{ padding: '10px' }}>{c.createdByAdminName}</td>
              <td style={{ padding: '10px' }}>{new Date(c.createdAt).toLocaleDateString('es-MX')}</td>
              <td style={{ padding: '10px' }}>
                <button
                  onClick={() => handleToggle(c.id)}
                  style={{ fontSize: 11, fontWeight: 600, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 9px', color: T.text, cursor: 'pointer' }}
                >
                  {c.active ? 'Desactivar' : 'Activar'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
