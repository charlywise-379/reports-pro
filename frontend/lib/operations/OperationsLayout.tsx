'use client'
import { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { useAdmin } from './AdminContext'
import { adminFetch } from './api'
import { useTheme } from './ThemeContext'
import { palette } from './theme'

const NAV_ITEMS = [
  { href: '/operations', label: 'Dashboard' },
  { href: '/operations/users', label: 'Usuarios' },
  { href: '/operations/reports', label: 'Reportes' },
  { href: '/operations/subscriptions', label: 'Suscripciones' },
  { href: '/operations/admins', label: 'Administradores', superAdminOnly: true },
]

export default function OperationsLayout({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdmin()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    await adminFetch('/api/operations/auth/logout', { method: 'POST' })
    router.push('/operations/login')
  }

  const T = palette[theme]

  if (loading) {
    return <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>
  }

  if (!admin) {
    return <>{children}</>
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, color: T.text, fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <aside style={{ width: 220, borderRight: `1px solid ${T.border}`, padding: 20, display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 28 }}>Operations</div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {NAV_ITEMS.filter(item => !item.superAdminOnly || admin.role === 'SUPER_ADMIN').map(item => (
            <Link key={item.href} href={item.href}
              style={{
                padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                color: pathname === item.href ? '#fff' : T.textMuted,
                background: pathname === item.href ? T.accent : 'transparent',
              }}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ height: 56, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 16, padding: '0 24px' }}>
          <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', fontSize: 16 }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <span style={{ fontSize: 13, color: T.textMuted }}>{admin.fullName} · {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</span>
          <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', color: T.text, cursor: 'pointer', fontSize: 12 }}>
            Salir
          </button>
        </header>
        <main style={{ flex: 1, padding: 24 }}>{children}</main>
      </div>
    </div>
  )
}
