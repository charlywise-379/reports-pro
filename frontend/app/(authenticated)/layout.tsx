import SupportWidget from '../../components/SupportWidget'

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <SupportWidget />
    </>
  )
}
