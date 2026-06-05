"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type Solicitud = {
  id: number
  aviso: string | null
  creacion: string
  equipo: { modelo: { modelo: string; marca: { marca: string } }; sede: { nombre: string } }
  servicio: { servicio: string }
}

export default function NuevaOrdenPage() {
  const router = useRouter()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [idSolicitud, setIdSolicitud] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/api/solicitudes?pageSize=200&sinOrden=true")
      .then((r) => r.json())
      .then((d) => setSolicitudes(d.items ?? []))
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!idSolicitud) {
      setError("Selecciona una solicitud")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/ordenes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idSolicitud: parseInt(idSolicitud) }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear la orden")
        return
      }
      const orden = await res.json()
      router.push(`/ordenes/${orden.id}`)
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
          <Link href="/ordenes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Nueva orden de servicio</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="idSolicitud">Solicitud de origen *</Label>
          <Select value={idSolicitud} onValueChange={setIdSolicitud}>
            <SelectTrigger id="idSolicitud">
              <SelectValue placeholder="Selecciona una solicitud aprobada…" />
            </SelectTrigger>
            <SelectContent>
              {solicitudes.length === 0 ? (
                <SelectItem value="__none" disabled>
                  No hay solicitudes disponibles
                </SelectItem>
              ) : (
                solicitudes.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    #{s.id} · {s.equipo.modelo.marca.marca} {s.equipo.modelo.modelo} — {s.equipo.sede.nombre}
                    {s.aviso ? ` · ${s.aviso}` : ""} [{s.servicio.servicio}]
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Solo se muestran solicitudes sin orden asignada</p>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !idSolicitud}>
            {loading ? "Creando…" : "Crear orden"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/ordenes">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
