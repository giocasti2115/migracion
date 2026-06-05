"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type Equipo = { id: number; serie: string | null; activoFijo: string | null; modelo: { modelo: string; marca: { marca: string } }; sede: { nombre: string } }
type Servicio = { id: number; servicio: string }

export default function NuevaSolicitudPage() {
  const router = useRouter()
  const [equipos, setEquipos] = useState<Equipo[]>([])
  const [servicios, setServicios] = useState<Servicio[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    idEquipo: "",
    idServicio: "",
    aviso: "",
    observacion: "",
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/equipos?pageSize=200").then((r) => r.json()),
      fetch("/api/catalogos/servicios?pageSize=200").then((r) => r.json()),
    ]).then(([eq, sv]) => {
      setEquipos(eq.items ?? [])
      setServicios(sv.items ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!form.idEquipo || !form.idServicio) {
      setError("Selecciona un equipo y un tipo de servicio")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/solicitudes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idEquipo: parseInt(form.idEquipo),
          idServicio: parseInt(form.idServicio),
          aviso: form.aviso || null,
          observacion: form.observacion || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear la solicitud")
        return
      }
      const s = await res.json()
      router.push(`/solicitudes/${s.id}`)
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
          <Link href="/solicitudes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Nueva solicitud</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Equipo */}
        <div className="space-y-1">
          <Label htmlFor="idEquipo">Equipo *</Label>
          <Select value={form.idEquipo} onValueChange={(v) => setForm((f) => ({ ...f, idEquipo: v }))}>
            <SelectTrigger id="idEquipo">
              <SelectValue placeholder="Selecciona un equipo…" />
            </SelectTrigger>
            <SelectContent>
              {equipos.map((eq) => (
                <SelectItem key={eq.id} value={String(eq.id)}>
                  {eq.modelo.marca.marca} {eq.modelo.modelo}
                  {eq.serie ? ` · ${eq.serie}` : eq.activoFijo ? ` · AF ${eq.activoFijo}` : ""}
                  {" — "}{eq.sede.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Servicio */}
        <div className="space-y-1">
          <Label htmlFor="idServicio">Tipo de servicio *</Label>
          <Select value={form.idServicio} onValueChange={(v) => setForm((f) => ({ ...f, idServicio: v }))}>
            <SelectTrigger id="idServicio">
              <SelectValue placeholder="Selecciona un servicio…" />
            </SelectTrigger>
            <SelectContent>
              {servicios.map((sv) => (
                <SelectItem key={sv.id} value={String(sv.id)}>
                  {sv.servicio}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aviso */}
        <div className="space-y-1">
          <Label htmlFor="aviso">Aviso / Título (opcional)</Label>
          <Input
            id="aviso"
            maxLength={255}
            value={form.aviso}
            onChange={(e) => setForm((f) => ({ ...f, aviso: e.target.value }))}
            placeholder="Resumen breve del problema…"
          />
        </div>

        {/* Observación */}
        <div className="space-y-1">
          <Label htmlFor="observacion">Observación (opcional)</Label>
          <Textarea
            id="observacion"
            rows={4}
            value={form.observacion}
            onChange={(e) => setForm((f) => ({ ...f, observacion: e.target.value }))}
            placeholder="Descripción detallada del problema o requerimiento…"
          />
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Crear solicitud"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/solicitudes">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
