export function isDoubleEncoded(text: string): boolean {
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

export function sanitizeUtf8(text: string | null | undefined): string | null | undefined {
  if (!text) return text
  return isDoubleEncoded(text) ? Buffer.from(text, "latin1").toString("utf8") : text
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function sanitizeUtf8Deep<T>(obj: T): T {
  if (typeof obj === "string") return sanitizeUtf8(obj) as T
  if (Array.isArray(obj)) return obj.map(sanitizeUtf8Deep) as T
  if (obj && typeof obj === "object") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result: any = Array.isArray(obj) ? [] : {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeUtf8Deep(value)
    }
    return result as T
  }
  return obj
}
