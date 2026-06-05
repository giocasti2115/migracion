/**
 * prisma/seed.ts — Datos mínimos para desarrollo y QA local
 *
 * Crea:
 *  - Catálogos de estados (solicitud, orden, visita, cotización)
 *  - Empresa / Departamento / Municipio de prueba
 *  - Cliente + Sede de prueba
 *  - Marca + Clase + Modelo + Servicio
 *  - Equipo de prueba
 *  - 5 usuarios QA (admin, analista, técnico, coordinador, comercial)
 *
 * Uso:
 *   npm run db:seed
 */

import { readFileSync } from "fs"
import { resolve } from "path"

// Cargar variables de .env.local si no están en el entorno (ejecución directa con tsx)
try {
  const lines = readFileSync(resolve(process.cwd(), ".env.local"), "utf-8").split("\n")
  for (const line of lines) {
    const m = line.match(/^([^#\s][^=]*)=(.+)$/)
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "")
    }
  }
} catch { /* en producción no existe .env.local, se usan las vars del entorno */ }

import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const db = new PrismaClient()

const BCRYPT_ROUNDS = 10

async function main() {
  console.log("🌱  Iniciando seed...")

  // ── 1. Estados de Solicitud ──────────────────────────────────────────────
  const solicitudEstados = ["Pendiente", "Aprobada", "Rechazada"]
  for (const estado of solicitudEstados) {
    await db.solicitudEstado.upsert({
      where: { id: solicitudEstados.indexOf(estado) + 1 },
      update: { estado },
      create: { estado },
    })
  }
  console.log("  ✓ Estados de Solicitud")

  // ── 2. Estados de Orden ──────────────────────────────────────────────────
  const ordenEstados = ["Abierta", "Cerrada", "Anulada"]
  for (const estado of ordenEstados) {
    await db.ordenEstado.upsert({
      where: { id: ordenEstados.indexOf(estado) + 1 },
      update: { estado },
      create: { estado },
    })
  }
  console.log("  ✓ Estados de Orden")

  // ── 3. Sub-estados de Orden (opcional, si el modelo los tiene) ───────────
  try {
    await db.ordenSubEstado.upsert({
      where: { id: 1 },
      update: { subEstado: "Normal" },
      create: { subEstado: "Normal" },
    })
  } catch {
    // modelo puede no existir en todas las versiones del schema
  }

  // ── 4. Estados de Visita ─────────────────────────────────────────────────
  const visitaEstados = ["Pendiente", "Aprobada", "Abierta", "Cerrada", "Rechazada"]
  for (const estado of visitaEstados) {
    await db.visitaEstado.upsert({
      where: { id: visitaEstados.indexOf(estado) + 1 },
      update: { estado },
      create: { estado },
    })
  }
  console.log("  ✓ Estados de Visita")

  // ── 5. Estados de Cotización ─────────────────────────────────────────────
  const cotizacionEstados = ["Borrador", "Aprobada", "Rechazada"]
  for (const estado of cotizacionEstados) {
    await db.cotizacionEstado.upsert({
      where: { id: cotizacionEstados.indexOf(estado) + 1 },
      update: { estado },
      create: { estado },
    })
  }
  console.log("  ✓ Estados de Cotización")

  // ── 6. Departamento + Municipio ──────────────────────────────────────────
  const dept = await db.departamento.upsert({
    where: { id: 1 },
    update: { nombre: "Cundinamarca", codigo: "25" },
    create: { nombre: "Cundinamarca", codigo: "25" },
  })
  const mpio = await db.municipio.upsert({
    where: { id: 1 },
    update: { nombre: "Bogotá D.C.", idDepartamento: dept.id },
    create: { nombre: "Bogotá D.C.", idDepartamento: dept.id },
  })
  console.log("  ✓ Departamento + Municipio")

  // ── 7. Empresa ───────────────────────────────────────────────────────────
  const empresa = await db.empresa.upsert({
    where: { id: 1 },
    update: { nombre: "ZIRIUZ S.A.S", nit: "900.000.001-0" },
    create: { nombre: "ZIRIUZ S.A.S", nit: "900.000.001-0" },
  })
  console.log("  ✓ Empresa")

  // ── 8. Cliente + Sede ────────────────────────────────────────────────────
  const cliente = await db.cliente.upsert({
    where: { id: 1 },
    update: { nombre: "Hospital QA Demo", activo: true, idEmpresa: empresa.id },
    create: { nombre: "Hospital QA Demo", activo: true, idEmpresa: empresa.id },
  })
  const sede = await db.sede.upsert({
    where: { id: 1 },
    update: { nombre: "Sede Principal", idCliente: cliente.id, idMunicipio: mpio.id },
    create: { nombre: "Sede Principal", idCliente: cliente.id, idMunicipio: mpio.id },
  })
  console.log("  ✓ Cliente + Sede")

  // ── 9. Catálogos de equipos ──────────────────────────────────────────────
  const marca = await db.marca.upsert({
    where: { id: 1 },
    update: { marca: "Siemens" },
    create: { marca: "Siemens" },
  })
  const clase = await db.clase.upsert({
    where: { id: 1 },
    update: { clase: "Electromedical" },
    create: { clase: "Electromedical" },
  })
  await db.modelo.upsert({
    where: { id: 1 },
    update: { modelo: "ACUSON X300", idMarca: marca.id, idClase: clase.id },
    create: { modelo: "ACUSON X300", idMarca: marca.id, idClase: clase.id },
  })

  // Servicio
  await db.servicio.upsert({
    where: { id: 1 },
    update: { servicio: "Correctivo" },
    create: { servicio: "Correctivo" },
  })
  await db.servicio.upsert({
    where: { id: 2 },
    update: { servicio: "Preventivo" },
    create: { servicio: "Preventivo" },
  })
  console.log("  ✓ Catálogos (Marca, Clase, Modelo, Servicio)")

  // Área
  await db.area.upsert({
    where: { id: 1 },
    update: { area: "Urgencias" },
    create: { area: "Urgencias" },
  }).catch(() => {}) // el model puede tener campo diferente

  // Tipo
  await db.tipo.upsert({
    where: { id: 1 },
    update: { tipo: "Diagnóstico" },
    create: { tipo: "Diagnóstico" },
  }).catch(() => {})

  // Equipo
  await db.equipo.upsert({
    where: { id: 1 },
    update: {},
    create: {
      serie: "SN-QA-001",
      activoFijo: "AF-0001",
      activo: true,
      idSede: sede.id,
      idModelo: 1,
    },
  }).catch((e: Error) => {
    console.log("  ! Equipo no creado (revisar campos requeridos):", e.message)
  })
  console.log("  ✓ Equipo de prueba")

  // ── 10. Usuarios QA ──────────────────────────────────────────────────────
  const QA_PASS = await hash("Ziriuz2024!", BCRYPT_ROUNDS)

  const usuarios = [
    { usuario: "admin.qa",        nombre: "Admin QA",        correo: "admin@ziriuz.local",        rol: "administrador" as const },
    { usuario: "analista.qa",     nombre: "Analista QA",     correo: "analista@ziriuz.local",     rol: "analista" as const },
    { usuario: "tecnico.qa",      nombre: "Técnico QA",      correo: "tecnico@ziriuz.local",      rol: "tecnico" as const },
    { usuario: "coordinador.qa",  nombre: "Coordinador QA",  correo: "coordinador@ziriuz.local",  rol: "coordinador" as const },
    { usuario: "comercial.qa",    nombre: "Comercial QA",    correo: "comercial@ziriuz.local",    rol: "comercial" as const },
  ]

  for (const u of usuarios) {
    const user = await db.usuario.upsert({
      where: { usuario: u.usuario },
      update: { clave: QA_PASS, activo: true },
      create: {
        usuario: u.usuario,
        nombre: u.nombre,
        correo: u.correo,
        clave: QA_PASS,
        activo: true,
      },
    })

    // Asignar rol
    if (u.rol === "administrador") {
      await db.administrador.upsert({
        where: { idUsuario: user.id },
        update: {},
        create: { idUsuario: user.id, activo: true },
      })
    } else if (u.rol === "analista") {
      await db.analista.upsert({
        where: { idUsuario: user.id },
        update: {},
        create: { idUsuario: user.id, activo: true },
      })
    } else if (u.rol === "tecnico") {
      await db.tecnico.upsert({
        where: { idUsuario: user.id },
        update: {},
        create: { idUsuario: user.id, activo: true },
      })
    } else if (u.rol === "coordinador") {
      await db.coordinador.upsert({
        where: { idUsuario: user.id },
        update: {},
        create: { idUsuario: user.id, activo: true },
      })
    } else if (u.rol === "comercial") {
      await db.comercial.upsert({
        where: { idUsuario: user.id },
        update: {},
        create: { idUsuario: user.id, activo: true },
      })
    }

    // Asignar sede al usuario
    await db.usuarioVsSede.upsert({
      where: { idUsuario_idSede: { idUsuario: user.id, idSede: sede.id } },
      update: {},
      create: { idUsuario: user.id, idSede: sede.id },
    }).catch(() => {})

    console.log(`  ✓ Usuario ${u.usuario} (${u.rol})`)
  }

  // ── 11. Resumen ──────────────────────────────────────────────────────────
  console.log("\n🎉  Seed completado exitosamente.")
  console.log("\n📋  Usuarios QA creados (contraseña: Ziriuz2024!):")
  console.log("     admin.qa        → Administrador (acceso total)")
  console.log("     analista.qa     → Analista")
  console.log("     tecnico.qa      → Técnico")
  console.log("     coordinador.qa  → Coordinador")
  console.log("     comercial.qa    → Comercial")
}

main()
  .catch((e) => {
    console.error("❌  Seed falló:", e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
