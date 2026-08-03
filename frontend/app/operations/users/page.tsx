'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/operations/api'
import { getStoredTheme, palette } from '@/lib/operations/theme'

type UserRow = {
  id: string; email: string; fullName: string | null; phone: string | null
  isSuspended: boolean; createdAt: string; projectCount: number; modules: string[]
}

export default function OperationsUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<UserRow | null>(null)
  const [suspendReason, setSuspendReason] = useState('')
  const T = palette[getStoredTheme()]

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '25' })
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    adminFetch(`/api/operations/users?${params}`)
      .then(res => res.json())
      .then(data => { setUsers(data.users); setTotal(data.total) })
  }

  useEffect(() => { load() }, [page, search, status])

  const handleSuspend = async (id: string) => {
    if (!suspendReason.trim()) return
    await adminFetch(`/api/operations/users/${id}/suspend`, { method: 'POST', body: JSON.stringify({ reason: suspendReason }) })
    setSuspendReason('')
    setSelected(null)
    load()
  }

  const handleReactivate = async (id: string) => {
    await adminFetch(`/api/operations/users/${id}/reactivate`, { method: 'POST' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este usuario permanentemente? Esta acción no se puede deshacer.')) return
    await adminFetch(`/api/operations/users/${id}`, { method: 'DELETE' })
    load()
  }

  const handleResetPassword = async (id: string) => {
    const res = await adminFetch(`/api/operations/users/${id}/reset-password`, { method: 'POST' })
    alert(res.ok ? 'Link de recuperación enviado.' : 'Error al generar el link.')
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (status) params.set('status', status)
    window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/operations/users/export?${params}`, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Usuarios</h1>
        <button onClick={handleExport} style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          Exportar CSV
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <input placeholder="Buscar por nombre o email" value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ flex: 1, padding: '8px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
        <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }}>
          <option value="">Todos los estados</option>
          <option value="active">Activos</option>
          <option value="suspended">Suspendidos</option>
        </select>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
              {['Nombre', 'Email', 'Proyectos', 'Módulos', 'Estado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: T.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 14px' }}>{u.fullName || '—'}</td>
                <td style={{ padding: '10px 14px' }}>{u.email}</td>
                <td style={{ padding: '10px 14px' }}>{u.projectCount}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: T.textMuted }}>{u.modules.join(', ') || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: u.isSuspended ? T.danger : T.success }}>
                    {u.isSuspended ? 'Suspendido' : 'Activo'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                  {u.isSuspended
                    ? <button onClick={() => handleReactivate(u.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, cursor: 'pointer' }}>Reactivar</button>
                    : <button onClick={() => setSelected(u)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, cursor: 'pointer' }}>Suspender</button>}
                  <button onClick={() => handleResetPassword(u.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, cursor: 'pointer' }}>Reset password</button>
                  <button onClick={() => handleDelete(u.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.danger}`, borderRadius: 6, padding: '4px 8px', color: T.danger, cursor: 'pointer' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: T.textMuted }}>
        <span>{total} usuarios en total</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', color: T.text, cursor: 'pointer' }}>Anterior</button>
          <span>Página {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 25 >= total} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', color: T.text, cursor: 'pointer' }}>Siguiente</button>
        </div>
      </div>

      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, width: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>Suspender a {selected.email}</div>
            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Motivo de la suspensión"
              style={{ width: '100%', minHeight: 80, padding: 10, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 14px', color: T.text, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={() => handleSuspend(selected.id)} style={{ background: T.danger, border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>Suspender</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
