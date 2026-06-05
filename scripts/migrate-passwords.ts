/**
 * scripts/migrate-passwords.ts
 *
 * One-time script to migrate plain-text (or MD5) passwords to bcrypt.
 * Identifies users whose `clave` does NOT start with a bcrypt prefix ($2a$ or $2b$).
 *
 * Usage:
 *   npx ts-node --project tsconfig.json scripts/migrate-passwords.ts            # live run
 *   npx ts-node --project tsconfig.json scripts/migrate-passwords.ts --dry-run  # preview only
 *
 * IMPORTANT: Run this script only once, in a controlled maintenance window.
 * Back up the database before running.
 */

import { PrismaClient } from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()
const DRY_RUN = process.argv.includes("--dry-run")
const BCRYPT_ROUNDS = 12

/** Returns true if the string is already a bcrypt hash. */
function isBcrypt(value: string): boolean {
  return value.startsWith("$2a$") || value.startsWith("$2b$") || value.startsWith("$2y$")
}

async function main() {
  console.log(`\n${DRY_RUN ? "[DRY-RUN] " : ""}Password migration starting...\n`)

  const users = await prisma.usuario.findMany({
    select: { id: true, usuario: true, clave: true },
  })

  const toMigrate = users.filter((u) => !isBcrypt(u.clave))

  console.log(`Total users: ${users.length}`)
  console.log(`Already bcrypt: ${users.length - toMigrate.length}`)
  console.log(`Needs migration: ${toMigrate.length}\n`)

  if (toMigrate.length === 0) {
    console.log("Nothing to do. All passwords are already hashed.")
    return
  }

  let migrated = 0
  let failed = 0

  for (const user of toMigrate) {
    try {
      const hashed = await hash(user.clave, BCRYPT_ROUNDS)

      if (DRY_RUN) {
        console.log(`[DRY-RUN] Would update user: ${user.usuario} (id=${user.id})`)
      } else {
        await prisma.usuario.update({
          where: { id: user.id },
          data: { clave: hashed },
        })
        console.log(`Updated: ${user.usuario} (id=${user.id})`)
      }

      migrated++
    } catch (err: any) {
      console.error(`Failed: ${user.usuario} (id=${user.id}) — ${err?.message}`)
      failed++
    }
  }

  console.log(`\n--- Summary ---`)
  console.log(`${DRY_RUN ? "[DRY-RUN] Would migrate" : "Migrated"}: ${migrated}`)
  if (failed > 0) console.log(`Failed: ${failed}`)
  console.log("Done.\n")
}

main()
  .catch((err) => {
    console.error("Fatal error:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
