"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ClipboardList,
  FileCheck2,
  CalendarCheck,
  RefreshCcw,
  FileText,
  Wrench,
  Users,
  Building2,
  BarChart3,
  Settings,
  BookOpen,
  QrCode,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { Rol } from "@/lib/permisos"

type NavItem = {
  href: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  roles: Rol[]
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["administrador", "analista", "tecnico", "coordinador", "comercial"],
  },
  {
    href: "/solicitudes",
    label: "Solicitudes",
    icon: ClipboardList,
    roles: ["administrador", "analista", "coordinador", "tecnico"],
  },
  {
    href: "/ordenes",
    label: "Órdenes",
    icon: FileCheck2,
    roles: ["administrador", "analista", "coordinador", "tecnico"],
  },
  {
    href: "/visitas",
    label: "Visitas",
    icon: CalendarCheck,
    roles: ["administrador", "analista", "coordinador", "tecnico"],
  },
  {
    href: "/preventivos",
    label: "Preventivos",
    icon: RefreshCcw,
    roles: ["administrador", "analista", "coordinador"],
  },
  {
    href: "/cotizaciones",
    label: "Cotizaciones",
    icon: FileText,
    roles: ["administrador", "comercial", "analista"],
  },
  {
    href: "/equipos",
    label: "Equipos",
    icon: Wrench,
    roles: ["administrador", "analista"],
  },
  {
    href: "/clientes",
    label: "Clientes",
    icon: Building2,
    roles: ["administrador", "analista"],
  },
  {
    href: "/sedes",
    label: "Sedes",
    icon: Building2,
    roles: ["administrador", "analista"],
  },
  {
    href: "/informes",
    label: "Informes",
    icon: BarChart3,
    roles: ["administrador", "analista", "coordinador"],
  },
  {
    href: "/administracion",
    label: "Administración",
    icon: Users,
    roles: ["administrador"],
  },
  {
    href: "/catalogos",
    label: "Catálogos",
    icon: BookOpen,
    roles: ["administrador"],
  },
]

interface SidebarProps {
  role: Rol
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()

  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role))

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Brand */}
      <div className="flex h-16 shrink-0 items-center border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <QrCode className="h-5 w-5" />
          </div>
          <span className="text-lg font-bold tracking-tight">ZIRIUZ</span>
        </Link>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {visibleItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href)

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Version */}
      <div className="shrink-0 border-t px-6 py-3">
        <p className="text-xs text-muted-foreground">ZIRIUZ v2.0</p>
      </div>
    </aside>
  )
}
