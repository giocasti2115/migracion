"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function NuevoClientePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    nombre: "",
    nit: "",
    correo: "",
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!form.nombre) {
      setError("El nombre del cliente es obligatorio")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/clientes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          nit: form.nit || null,
          correo: form.correo || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear el cliente")
        return
      }
      router.push("/clientes")
    } catch {
      setError("Error de red")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Nuevo cliente</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="nombre">Razón social / Nombre *</Label>
          <Input
            id="nombre"
            required
            maxLength={255}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Hospital General S.A."
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="nit">NIT / Identificación</Label>
          <Input
            id="nit"
            maxLength={20}
            value={form.nit}
            onChange={(e) => setForm((f) => ({ ...f, nit: e.target.value }))}
            placeholder="900.123.456-7"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="correo">Correo electrónico</Label>
          <Input
            id="correo"
            type="email"
            maxLength={255}
            value={form.correo}
            onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
            placeholder="contacto@cliente.com"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Crear cliente"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/clientes">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
