import { LucideIcon } from 'lucide-react'

export function StatusBadge({ label, color, icon: Icon, T, spin }: { label: string; color: string; icon: LucideIcon; T: any; spin?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, fontWeight: 700, color,
      background: `${color}1A`, border: `1px solid ${color}40`,
      borderRadius: 20, padding: '3px 9px',
    }}>
      <Icon size={12} className={spin ? 'operations-spin' : undefined} />
      {label}
    </span>
  )
}

export function Avatar({ name, T }: { name: string; T: any }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('') || '?'
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: `${T.accent}25`, color: T.accent,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800,
    }}>
      {initials}
    </div>
  )
}
