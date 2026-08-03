'use client'
import { useEffect, useState } from 'react'
import { useAdmin } from '@/lib/operations/AdminContext'
import { adminFetch } from '@/lib/operations/api'
import { getStoredTheme, palette } from '@/lib/operations/theme'

type AdminRow = { id: string; email: string; fullName: string; role: 'SUPER_ADMIN' | 'ADMIN'; createdAt: string }

export default function OperationsAdminsPage() {
  const { admin } = useAdmin()
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ email: '', fullName: '', password: '', role: 'ADMIN' as 'ADMIN' | 'SUPER_ADMIN' })
  const [error, setError] = useState('')
  const T = palette[getStoredTheme()]

  const load = () => {
    adminFetch('/api/operations/admins').then(res => res.json()).then(data => setAdmins(data.admins || []))
  }

  useEffect(() => { load() }, [])

  if (admin && admin.role !== 'SUPER_ADMIN') {
    return <div style={{ color: T.danger }}>No tienes permiso para ver esta sección.</div>
  }

  const handleCreate = async () => {
    setError('')
    const res = await adminFetch('/api/operations/admins', { method: 'POST', body: JSON.stringify(form) })
    if (res.ok) {
      setShowCreate(false)
      setForm({ email: '', fullName: '', password: '', role: 'ADMIN' })
      load()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || 'Error al crear administrador')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este administrador?')) return
    const res = await adminFetch(`/api/operations/admins/${id}`, { method: 'DELETE' })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Error al eliminar')
    }
    load()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Administradores</h1>
        <button onClick={() => setShowCreate(true)} style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          Nuevo administrador
        </button>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
              {['Nombre', 'Email', 'Rol', 'Creado', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: T.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {admins.map(a => (
              <tr key={a.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 14px' }}>{a.fullName}</td>
                <td style={{ padding: '10px 14px' }}>{a.email}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{a.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>{new Date(a.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px 14px' }}>
                  {a.role !== 'SUPER_ADMIN' && (
                    <button onClick={() => handleDelete(a.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.danger}`, borderRadius: 6, padding: '4px 8px', color: T.danger, cursor: 'pointer' }}>Eliminar</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 24, width: 380 }}>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Nuevo administrador</div>
            {error && <div style={{ background: 'rgba(248,113,113,0.15)', color: T.danger, padding: '8px 12px', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}
            <input placeholder="Nombre completo" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 10, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
            <input placeholder="Email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 10, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
            <input placeholder="Password (mín. 8 caracteres)" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })}
              style={{ width: '100%', padding: 10, marginBottom: 10, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }} />
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as any })}
              style={{ width: '100%', padding: 10, marginBottom: 16, background: T.bg, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text }}>
              <option value="ADMIN">Admin</option>
              <option value="SUPER_ADMIN">Super Admin</option>
            </select>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 14px', color: T.text, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreate} style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '8px 14px', color: '#fff', cursor: 'pointer' }}>Crear</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
