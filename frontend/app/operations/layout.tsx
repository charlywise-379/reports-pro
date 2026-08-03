import { AdminProvider } from '@/lib/operations/AdminContext'
import { ThemeProvider } from '@/lib/operations/ThemeContext'
import OperationsLayout from '@/lib/operations/OperationsLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <ThemeProvider>
        <OperationsLayout>{children}</OperationsLayout>
      </ThemeProvider>
    </AdminProvider>
  )
}
