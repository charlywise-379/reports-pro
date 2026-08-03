'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/operations/api'
import { palette } from '@/lib/operations/theme'
import { useTheme } from '@/lib/operations/ThemeContext'

type ReportRow = {
  id: string; status: string; createdAt: string; pdfSizeBytes: number | null; errorMessage: string | null
  project: { name: string; serviceType: string; user: { email: string } }
}

const STATUS_OPTIONS = ['', 'QUEUED', 'GENERATING', 'COMPLETED', 'FAILED']

export default function OperationsReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [status, setStatus] = useState('')
  const { theme } = useTheme()
  const T = palette[theme]

  const load = () => {
    const params = new URLSearchParams({ page: String(page), pageSize: '25' })
    if (status) params.set('status', status)
    adminFetch(`/api/operations/reports?${params}`)
      .then(res => res.ok ? res.json() : { reports: [], total: 0 })
      .then(data => { setReports(data.reports || []); setTotal(data.total || 0) })
  }

  useEffect(() => { load() }, [page, status])

  const handleRegenerate = async (id: string) => {
    if (!confirm('¿Regenerar este reporte? Se encolará un nuevo job de generación.')) return
    await adminFetch(`/api/operations/reports/${id}/regenerate`, { method: 'POST' })
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este reporte permanentemente (incluye el archivo)?')) return
    await adminFetch(`/api/operations/reports/${id}`, { method: 'DELETE' })
    load()
  }

  const handleExport = () => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/operations/reports/export?${params}`, '_blank')
  }

  const statusColor = (s: string) => s === 'COMPLETED' ? T.success : s === 'FAILED' ? T.danger : T.textMuted

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Reportes</h1>
        <button onClick={handleExport} style={{ background: T.accent, border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 12 }}>
          Exportar CSV
        </button>
      </div>

      <select value={status} onChange={e => { setStatus(e.target.value); setPage(1) }}
        style={{ padding: '8px 12px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, marginBottom: 16 }}>
        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s || 'Todos los estados'}</option>)}
      </select>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${T.border}`, textAlign: 'left' }}>
              {['Proyecto', 'Usuario', 'Módulo', 'Estado', 'Fecha', 'Acciones'].map(h => (
                <th key={h} style={{ padding: '10px 14px', color: T.textMuted, fontWeight: 600, fontSize: 11 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} style={{ borderBottom: `1px solid ${T.border}` }}>
                <td style={{ padding: '10px 14px' }}>{r.project.name}</td>
                <td style={{ padding: '10px 14px' }}>{r.project.user.email}</td>
                <td style={{ padding: '10px 14px', fontSize: 11, color: T.textMuted }}>{r.project.serviceType}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700, fontSize: 11, color: statusColor(r.status) }}>{r.status}</td>
                <td style={{ padding: '10px 14px', fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString()}</td>
                <td style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
                  {r.status === 'COMPLETED' && (
                    <a href={`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/operations/reports/${r.id}/download`} target="_blank" rel="noreferrer"
                      style={{ fontSize: 11, border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, textDecoration: 'none' }}>Descargar</a>
                  )}
                  <button onClick={() => handleRegenerate(r.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 8px', color: T.text, cursor: 'pointer' }}>Regenerar</button>
                  <button onClick={() => handleDelete(r.id)} style={{ fontSize: 11, background: 'none', border: `1px solid ${T.danger}`, borderRadius: 6, padding: '4px 8px', color: T.danger, cursor: 'pointer' }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, fontSize: 12, color: T.textMuted }}>
        <span>{total} reportes en total</span>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', color: T.text, cursor: 'pointer' }}>Anterior</button>
          <span>Página {page}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page * 25 >= total} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '4px 10px', color: T.text, cursor: 'pointer' }}>Siguiente</button>
        </div>
      </div>
    </div>
  )
}
