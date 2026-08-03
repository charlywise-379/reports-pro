import { AdminProvider } from '@/lib/operations/AdminContext'
import OperationsLayout from '@/lib/operations/OperationsLayout'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AdminProvider>
      <OperationsLayout>{children}</OperationsLayout>
    </AdminProvider>
  )
}
