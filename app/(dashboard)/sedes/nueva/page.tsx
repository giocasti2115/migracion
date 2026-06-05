"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type Cliente = { id: number; nombre: string }
type Municipio = { id: number; nombre: string; departamento: { nombre: string } }

export default function NuevaSedeePage() {
  const router = useRouter()
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [municipios, setMunicipios] = useState<Municipio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    nombre: "",
    idCliente: "",
    idMunicipio: "",
    direccion: "",
    telefonos: "",
    correo: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/clientes?pageSize=500").then((r) => r.json()),
      fetch("/api/municipios?pageSize=1200").then((r) => r.json()),
    ]).then(([cl, mn]) => {
      setClientes(cl.items ?? [])
      setMunicipios(mn.items ?? mn ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!form.nombre || !form.idCliente || !form.idMunicipio) {
      setError("Nombre, cliente y municipio son obligatorios")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/sedes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre,
          idCliente: parseInt(form.idCliente),
          idMunicipio: parseInt(form.idMunicipio),
          direccion: form.direccion || null,
          telefonos: form.telefonos || null,
          correo: form.correo || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear la sede")
        return
      }
      router.push("/sedes")
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
          <Link href="/sedes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Nueva sede</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre *</Label>
          <Input
            id="nombre"
            required
            maxLength={255}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Sede Principal"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="idCliente">Cliente *</Label>
          <Select value={form.idCliente} onValueChange={(v) => setForm((f) => ({ ...f, idCliente: v }))}>
            <SelectTrigger id="idCliente">
              <SelectValue placeholder="Selecciona un cliente…" />
            </SelectTrigger>
            <SelectContent>
              {clientes.map((c) => (
                <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="idMunicipio">Municipio *</Label>
          <Select value={form.idMunicipio} onValueChange={(v) => setForm((f) => ({ ...f, idMunicipio: v }))}>
            <SelectTrigger id="idMunicipio">
              <SelectValue placeholder="Selecciona un municipio…" />
            </SelectTrigger>
            <SelectContent>
              {municipios.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.nombre}{m.departamento ? ` — ${m.departamento.nombre}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="direccion">Dirección</Label>
          <Input
            id="direccion"
            maxLength={500}
            value={form.direccion}
            onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
            placeholder="Cra 7 # 32-16"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="telefonos">Teléfonos</Label>
          <Input
            id="telefonos"
            maxLength={100}
            value={form.telefonos}
            onChange={(e) => setForm((f) => ({ ...f, telefonos: e.target.value }))}
            placeholder="601 123 4567"
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
            placeholder="sede@cliente.com"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Crear sede"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/sedes">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
