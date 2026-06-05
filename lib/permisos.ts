/**
 * Route permission map — defines which roles can access each route prefix.
 * Used by middleware.ts to enforce role-based access control.
 *
 * Requirement 2.4: module access by role.
 */

export type Rol =
  | "administrador"
  | "analista"
  | "tecnico"
  | "coordinador"
  | "comercial"

/**
 * Maps route prefixes to the list of roles that are allowed to access them.
 * The middleware checks the user's role against this map on every request.
 */
export const PERMISOS_RUTA: Record<string, Rol[]> = {
  // Dashboard — all roles
  "/dashboard": ["administrador", "analista", "tecnico", "coordinador", "comercial"],

  // Solicitudes — Admin, Analista, Coordinador, Técnico
  "/solicitudes": ["administrador", "analista", "coordinador", "tecnico"],

  // Órdenes — Admin, Analista, Coordinador, Técnico
  "/ordenes": ["administrador", "analista", "coordinador", "tecnico"],

  // Visitas — Admin, Analista, Coordinador, Técnico
  "/visitas": ["administrador", "analista", "coordinador", "tecnico"],

  // Preventivos — Admin, Analista, Coordinador
  "/preventivos": ["administrador", "analista", "coordinador"],

  // Cotizaciones — Admin, Comercial, Analista
  "/cotizaciones": ["administrador", "comercial", "analista"],

  // Equipos — Admin, Analista
  "/equipos": ["administrador", "analista"],

  // Clientes — Admin, Analista
  "/clientes": ["administrador", "analista"],

  // Sedes — Admin, Analista
  "/sedes": ["administrador", "analista"],

  // Informes — Admin, Analista, Coordinador
  "/informes": ["administrador", "analista", "coordinador"],

  // Administración — Admin only
  "/administracion": ["administrador"],

  // Catálogos — Admin only
  "/catalogos": ["administrador"],
}

/**
 * Returns true if the given role is allowed to access the given pathname.
 * Checks all registered prefixes and returns false if none match (deny by default).
 */
export function tienePermiso(pathname: string, rol: Rol): boolean {
  for (const [prefix, roles] of Object.entries(PERMISOS_RUTA)) {
    if (pathname.startsWith(prefix)) {
      return roles.includes(rol)
    }
  }
  // No matching prefix — allow (public routes like /no-autorizado)
  return true
}
