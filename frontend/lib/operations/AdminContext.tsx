'use client'
import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { adminFetch } from './api'

type Admin = { id: string; email: string; fullName: string; role: 'SUPER_ADMIN' | 'ADMIN' }

const AdminContext = createContext<{ admin: Admin | null; loading: boolean }>({ admin: null, loading: true })

export function AdminProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminFetch('/api/operations/auth/me')
      .then(res => res.ok ? res.json() : null)
      .then(setAdmin)
      .finally(() => setLoading(false))
  }, [])

  return <AdminContext.Provider value={{ admin, loading }}>{children}</AdminContext.Provider>
}

export function useAdmin() {
  return useContext(AdminContext)
}
