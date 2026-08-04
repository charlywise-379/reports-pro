'use client'
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { FileText, Users, CreditCard, TrendingUp, DollarSign, Repeat, LucideIcon } from 'lucide-react'
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

function Card({ label, value, icon: Icon, T }: { label: string; value: string; icon: LucideIcon; T: any }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${T.accent}20`, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={19} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 11, color: T.textMuted, fontWeight: 600, marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: T.text }}>{value}</div>
      </div>
    </div>
  )
}

function TrendTooltip({ active, payload, T }: { active?: boolean; payload?: any[]; T: any }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', fontSize: 12 }}>
      <div style={{ color: T.textMuted, marginBottom: 2 }}>{payload[0].payload.month}</div>
      <div style={{ color: T.text, fontWeight: 700 }}>${payload[0].value.toFixed(2)}</div>
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

  const maxFreqCount = Math.max(...data.subscriptionsByFrequency.map(f => f.count), 1)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h1 style={{ fontSize: 20, fontWeight: 800 }}>Dashboard</h1>
        <select value={module} onChange={e => setModule(e.target.value)}
          style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '8px 12px', color: T.text }}>
          {MODULES.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
        <Card label="Reportes activos" value={String(data.activeReports)} icon={FileText} T={T} />
        <Card label="Usuarios activos" value={String(data.activeUsers)} icon={Users} T={T} />
        <Card label="Suscripciones activas" value={String(data.activeSubscriptions)} icon={CreditCard} T={T} />
        <Card label="Nuevo MRR del mes" value={`$${data.newMrrThisMonth.toFixed(2)}`} icon={TrendingUp} T={T} />
        <Card label="Nuevo MRR de la semana" value={`$${data.newMrrThisWeek.toFixed(2)}`} icon={TrendingUp} T={T} />
        <Card label="MRR (recurrente)" value={`$${data.monthlyRecurringRevenue.toFixed(2)}`} icon={DollarSign} T={T} />
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Suscripciones activas por frecuencia</div>
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          {data.subscriptionsByFrequency.map(f => (
            <div key={f.frequency} style={{ minWidth: 100 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Repeat size={13} color={T.accent} />
                <span style={{ fontSize: 20, fontWeight: 800 }}>{f.count}</span>
                <span style={{ fontSize: 11, color: T.textMuted }}>{f.frequency}</span>
              </div>
              <div style={{ height: 4, background: T.border, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(f.count / maxFreqCount) * 100}%`, background: T.accent, borderRadius: 2 }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Ingresos — últimos 6 meses</div>
        <div style={{ width: '100%', height: 160 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.trend} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="operationsRevenueFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.accent} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={T.accent} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="month" tickFormatter={(m: string) => m.slice(5)} tick={{ fill: T.textMuted, fontSize: 10 }} axisLine={{ stroke: T.border }} tickLine={false} />
              <Tooltip content={<TrendTooltip T={T} />} />
              <Area type="monotone" dataKey="revenue" stroke={T.accent} strokeWidth={2} fill="url(#operationsRevenueFill)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
