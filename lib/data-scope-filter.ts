import { prisma } from "./prisma"

/**
 * Returns the list of sede IDs that a given user has access to.
 *
 * - Administradores and Analistas get ALL sedes (unrestricted).
 * - All other roles receive only the sedes explicitly assigned via:
 *   • `usuarios_vs_sedes` (direct sede assignment)
 *   • `usuarios_vs_clientes` → sedes that belong to those clients
 *
 * Used by every list API to enforce data-scope filtering (Requirement 5.1).
 */
export async function getSedesRelacionadas(
  idUsuario: number,
  rol: string
): Promise<number[] | "all"> {
  if (rol === "administrador" || rol === "analista") return "all"

  const [directas, porCliente] = await Promise.all([
    // Sedes assigned directly to the user
    prisma.usuarioVsSede.findMany({
      where: { idUsuario },
      select: { idSede: true },
    }),
    // Sedes belonging to clients assigned to the user
    prisma.usuarioVsCliente
      .findMany({
        where: { idUsuario },
        select: { idCliente: true },
      })
      .then((rels) =>
        prisma.sede.findMany({
          where: { idCliente: { in: rels.map((r) => r.idCliente) } },
          select: { id: true },
        })
      ),
  ])

  const ids = [
    ...new Set([
      ...directas.map((r) => r.idSede),
      ...porCliente.map((r) => r.id),
    ]),
  ]

  return ids
}

/**
 * Builds a Prisma `where` clause fragment that restricts results to the sedes
 * the current user is allowed to see.
 *
 * @param sedeIds  Result from `getSedesRelacionadas`
 * @param field    The field path pointing to the sede ID (default: "idSede")
 */
export function buildSedeFilter(
  sedeIds: number[] | "all",
  field = "idSede"
): Record<string, unknown> {
  if (sedeIds === "all") return {}
  return { [field]: { in: sedeIds } }
}
