import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Merges Tailwind CSS class names, resolving conflicts intelligently.
 * Used by shadcn/ui components.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats a date to a localized Spanish string.
 */
export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

/**
 * Formats a date with time to a localized Spanish string.
 */
export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = typeof date === "string" ? new Date(date) : date
  return d.toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

/**
 * Calculates the number of calendar days between two dates.
 * Returns 0 if the result would be negative (guards against clock skew).
 *
 * Used for `diasFuera` calculation (Requirement 4.1).
 */
export function calcularDiasFuera(
  fechaCreacion: Date,
  fechaCierre?: Date | null
): number {
  const fin = fechaCierre ?? new Date()
  const inicio = new Date(fechaCreacion)

  // Normalize to midnight to count calendar days, not partial days
  inicio.setHours(0, 0, 0, 0)
  fin.setHours(0, 0, 0, 0)

  const diffMs = fin.getTime() - inicio.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  // Requirement 4.1: diasFuera >= 0
  return Math.max(0, diffDays)
}

/**
 * Formats a currency value in Colombian pesos.
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—"
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(value)
}

/**
 * Truncates a string to a maximum length, appending "..." if truncated.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength - 3) + "..."
}
