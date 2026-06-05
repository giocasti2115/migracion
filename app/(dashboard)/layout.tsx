import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { Sidebar } from "@/components/layout/Sidebar"
import { Header } from "@/components/layout/Header"
import type { Rol } from "@/lib/permisos"

/**
 * Authenticated dashboard layout — wraps all protected pages.
 * Renders role-filtered Sidebar and Header using server-side session.
 * Task 1.7.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()
  if (!session) redirect("/login")

  const userName = session.user?.name ?? "Usuario"
  const userRole = (session.user as { role?: string }).role ?? "tecnico"

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop only */}
      <div className="hidden lg:flex lg:shrink-0">
        <Sidebar role={userRole as Rol} />
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userName={userName} userRole={userRole} />
        <main className="flex-1 overflow-y-auto bg-muted/20 p-6">{children}</main>
      </div>
    </div>
  )
}
