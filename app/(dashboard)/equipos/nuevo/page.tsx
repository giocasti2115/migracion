"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

type Modelo = { id: number; modelo: string; marca: { marca: string } }
type Sede = { id: number; nombre: string; cliente: { nombre: string } }

export default function NuevoEquipoPage() {
  const router = useRouter()
  const [modelos, setModelos] = useState<Modelo[]>([])
  const [sedes, setSedes] = useState<Sede[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    idModelo: "",
    idSede: "",
    serie: "",
    activoFijo: "",
    ubicacion: "",
    mtto: false,
  })

  useEffect(() => {
    Promise.all([
      fetch("/api/catalogos/modelos?pageSize=500").then((r) => r.json()),
      fetch("/api/sedes?pageSize=500").then((r) => r.json()),
    ]).then(([md, sd]) => {
      setModelos(md.items ?? [])
      setSedes(sd.items ?? [])
    })
  }, [])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!form.idModelo || !form.idSede) {
      setError("Modelo y sede son obligatorios")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/equipos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          idModelo: parseInt(form.idModelo),
          idSede: parseInt(form.idSede),
          serie: form.serie || null,
          activoFijo: form.activoFijo || null,
          ubicacion: form.ubicacion || null,
          mtto: form.mtto,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear el equipo")
        return
      }
      router.push("/equipos")
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
          <Link href="/equipos"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Nuevo equipo</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="idModelo">Modelo *</Label>
          <Select value={form.idModelo} onValueChange={(v) => setForm((f) => ({ ...f, idModelo: v }))}>
            <SelectTrigger id="idModelo">
              <SelectValue placeholder="Selecciona un modelo…" />
            </SelectTrigger>
            <SelectContent>
              {modelos.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.marca.marca} — {m.modelo}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="idSede">Sede *</Label>
          <Select value={form.idSede} onValueChange={(v) => setForm((f) => ({ ...f, idSede: v }))}>
            <SelectTrigger id="idSede">
              <SelectValue placeholder="Selecciona una sede…" />
            </SelectTrigger>
            <SelectContent>
              {sedes.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.nombre} — {s.cliente.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="serie">Número de serie</Label>
          <Input
            id="serie"
            maxLength={100}
            value={form.serie}
            onChange={(e) => setForm((f) => ({ ...f, serie: e.target.value }))}
            placeholder="SN-XXXX"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="activoFijo">Activo fijo</Label>
          <Input
            id="activoFijo"
            maxLength={100}
            value={form.activoFijo}
            onChange={(e) => setForm((f) => ({ ...f, activoFijo: e.target.value }))}
            placeholder="AF-0001"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="ubicacion">Ubicación</Label>
          <Input
            id="ubicacion"
            maxLength={255}
            value={form.ubicacion}
            onChange={(e) => setForm((f) => ({ ...f, ubicacion: e.target.value }))}
            placeholder="Piso 2, Sala de UCI"
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="mtto"
            checked={form.mtto}
            onCheckedChange={(v) => setForm((f) => ({ ...f, mtto: !!v }))}
          />
          <Label htmlFor="mtto" className="cursor-pointer">Requiere mantenimiento preventivo</Label>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Crear equipo"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/equipos">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
