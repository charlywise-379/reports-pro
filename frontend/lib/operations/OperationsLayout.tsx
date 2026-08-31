'use client'
import { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { LayoutDashboard, Users, FileText, CreditCard, Ticket, ShieldCheck, Menu, X, Sun, Moon, LogOut } from 'lucide-react'
import { useAdmin } from './AdminContext'
import { adminFetch } from './api'
import { useTheme } from './ThemeContext'
import { palette } from './theme'

const NAV_ITEMS = [
  { href: '/operations', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/operations/users', label: 'Usuarios', icon: Users },
  { href: '/operations/reports', label: 'Reportes', icon: FileText },
  { href: '/operations/subscriptions', label: 'Suscripciones', icon: CreditCard },
  { href: '/operations/promo-codes', label: 'Códigos Promocionales', icon: Ticket },
  { href: '/operations/admins', label: 'Administradores', icon: ShieldCheck, superAdminOnly: true },
]

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

export default function OperationsLayout({ children }: { children: ReactNode }) {
  const { admin, loading } = useAdmin()
  const { theme, toggleTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const isMobile = useIsMobile()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await adminFetch('/api/operations/auth/logout', { method: 'POST' })
    router.push('/operations/login')
  }

  const T = palette[theme]

  useEffect(() => {
    if (!loading && admin && pathname === '/operations/login') {
      router.replace('/operations')
    }
  }, [loading, admin, pathname, router])

  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  if (loading) {
    return <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando...</div>
  }

  if (!admin) {
    return <>{children}</>
  }

  if (pathname === '/operations/login') {
    return <div style={{ minHeight: '100vh', background: T.bg, color: T.text, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Redirigiendo...</div>
  }

  const visibleNavItems = NAV_ITEMS.filter(item => !item.superAdminOnly || admin.role === 'SUPER_ADMIN')

  const sidebarContent = (
    <>
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <img src={theme === 'dark' ? '/logo-full.png' : '/logo-full-dark.png'} alt="Omni Reports" style={{ height: 26, width: 'auto' }} />
        {isMobile && (
          <button onClick={() => setSidebarOpen(false)} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        )}
      </div>
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
        {visibleNavItems.map(item => {
          const Icon = item.icon
          const active = pathname === item.href
          return (
            <Link key={item.href} href={item.href}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                color: active ? '#fff' : T.textMuted,
                background: active ? T.accent : 'transparent',
              }}>
              <Icon size={16} />
              {item.label}
            </Link>
          )
        })}
      </nav>
    </>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: T.bg, color: T.text, fontFamily: '"Plus Jakarta Sans",system-ui,sans-serif' }}>
      <style>{`
        @keyframes operations-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .operations-spin { animation: operations-spin 1s linear infinite; }
      `}</style>

      {!isMobile && (
        <aside style={{ width: 220, borderRight: `1px solid ${T.border}`, padding: 20, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          {sidebarContent}
        </aside>
      )}

      {isMobile && sidebarOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex' }}>
          <div onClick={() => setSidebarOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)' }} />
          <aside style={{ position: 'relative', width: 240, background: T.bg, borderRight: `1px solid ${T.border}`, padding: 20, display: 'flex', flexDirection: 'column', zIndex: 201 }}>
            {sidebarContent}
          </aside>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{ height: 56, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0 }}>
          {isMobile ? (
            <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: T.text, cursor: 'pointer', padding: 4, display: 'flex' }}>
              <Menu size={20} />
            </button>
          ) : <span />}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={toggleTheme} style={{ background: 'none', border: 'none', color: T.textMuted, cursor: 'pointer', display: 'flex', padding: 4 }}>
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {!isMobile && <span style={{ fontSize: 13, color: T.textMuted }}>{admin.fullName} · {admin.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'}</span>}
            <button onClick={handleLogout} style={{ background: 'none', border: `1px solid ${T.border}`, borderRadius: 8, padding: '6px 12px', color: T.text, cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <LogOut size={13} />
              {!isMobile && 'Salir'}
            </button>
          </div>
        </header>
        <main style={{ flex: 1, padding: isMobile ? 16 : 24, overflow: 'auto' }}>{children}</main>
      </div>
    </div>
  )
}
