"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Link from "next/link"
import { ArrowLeft, Eye, EyeOff } from "lucide-react"

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "analista", label: "Analista" },
  { value: "coordinador", label: "Coordinador" },
  { value: "tecnico", label: "Técnico" },
  { value: "comercial", label: "Comercial" },
]

export default function NuevoUsuarioPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showPass, setShowPass] = useState(false)

  const [form, setForm] = useState({
    usuario: "",
    nombre: "",
    cedula: "",
    correo: "",
    telefonos: "",
    rol: "",
    clave: "",
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    if (!form.usuario || !form.nombre || !form.rol) {
      setError("Usuario, nombre y rol son obligatorios")
      return
    }
    if (form.clave && form.clave.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          usuario: form.usuario,
          nombre: form.nombre,
          cedula: form.cedula || null,
          correo: form.correo || null,
          telefonos: form.telefonos || null,
          rol: form.rol,
          clave: form.clave || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Error al crear el usuario")
        return
      }
      router.push("/administracion")
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
          <Link href="/administracion"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <h1 className="text-2xl font-semibold">Nuevo usuario</h1>
      </div>

      {error && (
        <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <Label htmlFor="usuario">Usuario *</Label>
          <Input
            id="usuario"
            required
            minLength={3}
            maxLength={100}
            value={form.usuario}
            onChange={(e) => setForm((f) => ({ ...f, usuario: e.target.value.trim() }))}
            placeholder="juan.perez"
            autoComplete="username"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="nombre">Nombre completo *</Label>
          <Input
            id="nombre"
            required
            maxLength={255}
            value={form.nombre}
            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
            placeholder="Juan Pérez"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="rol">Rol *</Label>
          <Select value={form.rol} onValueChange={(v) => setForm((f) => ({ ...f, rol: v }))}>
            <SelectTrigger id="rol">
              <SelectValue placeholder="Selecciona un rol…" />
            </SelectTrigger>
            <SelectContent>
              {ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="cedula">Cédula</Label>
          <Input
            id="cedula"
            maxLength={20}
            value={form.cedula}
            onChange={(e) => setForm((f) => ({ ...f, cedula: e.target.value }))}
            placeholder="1000123456"
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
            placeholder="juan@empresa.com"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="telefonos">Teléfonos</Label>
          <Input
            id="telefonos"
            maxLength={100}
            value={form.telefonos}
            onChange={(e) => setForm((f) => ({ ...f, telefonos: e.target.value }))}
            placeholder="300 123 4567"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="clave">Contraseña (mínimo 8 caracteres)</Label>
          <div className="relative">
            <Input
              id="clave"
              type={showPass ? "text" : "password"}
              minLength={8}
              maxLength={200}
              value={form.clave}
              onChange={(e) => setForm((f) => ({ ...f, clave: e.target.value }))}
              placeholder="••••••••"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              tabIndex={-1}
              onClick={() => setShowPass((v) => !v)}
              aria-label={showPass ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit" disabled={loading}>
            {loading ? "Guardando…" : "Crear usuario"}
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/administracion">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  )
}
