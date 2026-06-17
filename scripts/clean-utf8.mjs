/**
 * One-time script to fix double-encoded UTF-8 data in the database.
 *
 * Usage: DATABASE_URL="mysql://..." node scripts/clean-utf8.mjs
 *
 * Scans all string/text columns in all tables and fixes mojibake
 * (e.g. "EstÃ©tica" -> "Estética").
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function isDoubleEncoded(text) {
  if (!text || /^[\x00-\x7F]*$/.test(text)) return false
  const reEncoded = Buffer.from(text, "latin1").toString("utf8")
  if (reEncoded === text) return false

  const countFixed = (reEncoded.match(/[áéíóúñüÁÉÍÓÚÑÜ]/g) || []).length
  const countOriginal = (text.match(/[áéíóúñüÁÉÍÓÚÑÜ]/g) || []).length
  if (countFixed > countOriginal) return true

  if (countFixed === 0 && countOriginal === 0) {
    const reValid = (reEncoded.match(/[a-záéíóúñüA-ZÁÉÍÓÚÑÜ0-9\s,.-]/g) || []).length / reEncoded.length
    const origValid = (text.match(/[a-záéíóúñüA-ZÁÉÍÓÚÑÜ0-9\s,.-]/g) || []).length / text.length
    if (reValid > origValid + 0.1 && reValid > 0.8) return true
  }
  return false
}

function sanitizeUtf8(text) {
  if (!text) return text
  return isDoubleEncoded(text) ? Buffer.from(text, "latin1").toString("utf8") : text
}

async function main() {
  const schema = process.env.DATABASE_URL.includes("railway") ? "railway" : "ziriuz"

  // Find all varchar/text columns
  const cols = await prisma.$queryRawUnsafe(`
    SELECT TABLE_NAME AS tbl, COLUMN_NAME AS col
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND DATA_TYPE IN ('varchar','text','char','mediumtext','longtext')
      AND TABLE_NAME NOT LIKE '\\_%'
  `, schema)

  let totalFixed = 0
  let totalChecked = 0

  for (const { tbl, col } of cols) {
    const batchSize = 500
    let offset = 0

    while (true) {
      const rows = await prisma.$queryRawUnsafe(
        `SELECT id, \`${col}\` AS val FROM \`${tbl}\` WHERE id IS NOT NULL LIMIT ? OFFSET ?`,
        batchSize, offset
      )
      if (rows.length === 0) break
      offset += rows.length

      for (const row of rows) {
        const val = row.val
        if (typeof val !== "string") continue
        totalChecked++
        const cleaned = sanitizeUtf8(val)
        if (cleaned !== val) {
          await prisma.$executeRawUnsafe(
            `UPDATE \`${tbl}\` SET \`${col}\` = ? WHERE id = ?`,
            cleaned, row.id
          )
          totalFixed++
          if (totalFixed <= 10 || totalFixed % 500 === 0) {
            console.log(`Fixed ${tbl}.${col} (#${row.id}): "${val}" -> "${cleaned}"`)
          }
        }
      }
    }
  }

  console.log(`\nDone! Checked ${totalChecked} string values, fixed ${totalFixed} cells.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
