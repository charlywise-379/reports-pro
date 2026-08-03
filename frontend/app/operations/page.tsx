'use client'
import { useEffect, useState } from 'react'
import { adminFetch } from '@/lib/operations/api'
import { palette } from '@/lib/operations/theme'
import { useTheme } from '@/lib/operations/ThemeContext'

const MODULES = [
  { value: '', label: 'Todos los módulos' },
  { value: 'COMPETITIVE_INTELLIGENCE', label: 'Inteligencia Competitiva' },
  { value: 'CORPORATE_HEALTH', label: 'Salud Corporativa' },
  { value: 'CYBERSECURITY_RADAR', label: 'Radar de Ciberseguridad' },
]

type DashboardData = {
  activeReports: number
  activeUsers: number
  activeSubscriptions: number
  newMrrThisMonth: number
  newMrrThisWeek: number
  monthlyRecurringRevenue: number
  subscriptionsByFrequency: { frequency: string; count: number }[]
  trend: { month: string; revenue: number; newSubs: number }[]
}

function Card({ label, value, T }: { label: string; value: string; T: any }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
      <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: T.text }}>{value}</div>
    </div>
  )
}

export default function OperationsDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [module, setModule] = useState('')
  const { theme } = useTheme()
  const T = palette[theme]

  useEffect(() => {
    adminFetch(`/api/operations/dashboard${module ? `?module=${module}` : ''}`)
      .then(res => res.json())
      .then(setData)
  }, [module])

  if (!data) return <div style={{ color: T.textMuted }}>Cargando...</div>

  const maxTrendRevenue = Math.max(...data.trend.map(t => t.revenue), 1)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</h1>
        <select value={module} onChange={e => setModule(e.target.value)}
          style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text }}>
          {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Card label="Reportes activos" value={String(data.activeReports)} T={T} />
        <Card label="Usuarios activos" value={String(data.activeUsers)} T={T} />
        <Card label="Suscripciones activas" value={String(data.activeSubscriptions)} T={T} />
        <Card label="Nuevo MRR del mes" value={`$${data.newMrrThisMonth.toFixed(2)}`} T={T} />
        <Card label="Nuevo MRR de la semana" value={`$${data.newMrrThisWeek.toFixed(2)}`} T={T} />
        <Card label="MRR (recurrente)" value={`$${data.monthlyRecurringRevenue.toFixed(2)}`} T={T} />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Suscripciones activas por frecuencia</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {data.subscriptionsByFrequency.map(f => (
            <div key={f.frequency}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>{f.count}</div>
              <div style={{ fontSize: 11, color: T.textMuted }}>{f.frequency}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Ingresos — últimos 6 meses</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {data.trend.map(t => (
            <div key={t.month} style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                height: `${(t.revenue / maxTrendRevenue) * 100}px`,
                background: T.accent, borderRadius: '4px 4px 0 0', marginBottom: 6,
              }} />
              <div style={{ fontSize: 9, color: T.textMuted }}>{t.month.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
