"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

const SEGMENT_LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  solicitudes: "Solicitudes",
  ordenes: "Órdenes",
  visitas: "Visitas",
  preventivos: "Preventivos",
  cotizaciones: "Cotizaciones",
  equipos: "Equipos",
  clientes: "Clientes",
  sedes: "Sedes",
  informes: "Informes",
  administracion: "Administración",
  catalogos: "Catálogos",
  nueva: "Nueva",
  nuevo: "Nuevo",
  editar: "Editar",
}

function toLabel(segment: string): string {
  // Numeric id segments — truncate for display
  if (/^\d+$/.test(segment)) return `#${segment}`
  return SEGMENT_LABELS[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1)
}

export function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split("/").filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((seg, i) => ({
    label: toLabel(seg),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }))

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
          {crumb.isLast ? (
            <span className="font-medium text-foreground">{crumb.label}</span>
          ) : (
            <Link
              href={crumb.href}
              className={cn(
                "text-muted-foreground hover:text-foreground transition-colors"
              )}
            >
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}
