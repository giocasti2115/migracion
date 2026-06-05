"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Eye, Trash2, UserX, UserCheck, Search } from "lucide-react"
import Link from "next/link"

// ─── Types ──────────────────────────────────────────────────────────────────

interface Usuario {
  id: number
  usuario: string
  nombre: string
  cedula: string | null
  correo: string | null
  telefonos: string | null
  activo: boolean
  rol: string
}

interface Sesion {
  id: number
  idUsuario: number
  creacion: string
  activa: boolean
  lat: number | null
  lng: number | null
  usuario: { nombre: string; usuario: string }
}

// ─── ROL BADGE ───────────────────────────────────────────────────────────────

const ROL_VARIANT: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  administrador: "destructive",
  coordinador: "default",
  analista: "secondary",
  tecnico: "outline",
  comercial: "outline",
}

function RolBadge({ rol }: { rol: string }) {
  return (
    <Badge variant={ROL_VARIANT[rol] ?? "outline"} className="capitalize">
      {rol}
    </Badge>
  )
}

// ─── USUARIOS TABLE ───────────────────────────────────────────────────────────

function UsuariosTab() {
  const [q, setQ] = useState("")
  const [soloActivos, setSoloActivos] = useState(true)
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<{ data: Usuario[] }>({
    queryKey: ["usuarios", q, soloActivos],
    queryFn: async () => {
      const params = new URLSearchParams({ q, activo: String(soloActivos), pageSize: "100" })
      const res = await fetch(`/api/usuarios?${params}`)
      if (!res.ok) throw new Error("Error al cargar usuarios")
      return res.json()
    },
  })

  const toggleActivo = useMutation({
    mutationFn: async ({ id, activo }: { id: number; activo: boolean }) => {
      const res = await fetch(`/api/usuarios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo }),
      })
      if (!res.ok) throw new Error("Error al actualizar usuario")
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  })

  const usuarios = data?.data ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, usuario o correo…"
            className="pl-9"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <Button
          variant={soloActivos ? "default" : "outline"}
          size="sm"
          onClick={() => setSoloActivos((v) => !v)}
        >
          {soloActivos ? "Solo activos" : "Todos"}
        </Button>
        <Button size="sm" asChild>
          <Link href="/administracion/usuarios/nuevo">+ Nuevo usuario</Link>
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No se encontraron usuarios
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{u.id}
                  </TableCell>
                  <TableCell className="font-medium">{u.usuario}</TableCell>
                  <TableCell>{u.nombre}</TableCell>
                  <TableCell>
                    <RolBadge rol={u.rol} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {u.correo ?? "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={u.activo ? "default" : "secondary"}>
                      {u.activo ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild title="Ver detalle">
                        <Link href={`/administracion/usuarios/${u.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        title={u.activo ? "Desactivar" : "Activar"}
                        onClick={() => toggleActivo.mutate({ id: u.id, activo: !u.activo })}
                      >
                        {u.activo ? (
                          <UserX className="h-4 w-4 text-destructive" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        {usuarios.length} usuario{usuarios.length !== 1 ? "s" : ""}
      </p>
    </div>
  )
}

// ─── SESIONES TABLE ───────────────────────────────────────────────────────────

function SesionesTab() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<Sesion[]>({
    queryKey: ["sesiones"],
    queryFn: async () => {
      const res = await fetch("/api/sesiones")
      if (!res.ok) throw new Error("Error al cargar sesiones")
      return res.json()
    },
    refetchInterval: 30_000, // refresh every 30s
  })

  const revocar = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/sesiones/${id}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Error al revocar sesión")
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sesiones"] }),
  })

  const sesiones = data ?? []
  const activas = sesiones.filter((s) => s.activa)

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {activas.length} sesión{activas.length !== 1 ? "es" : ""} activa{activas.length !== 1 ? "s" : ""}
        {" · "}actualizado cada 30 s
      </p>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Inicio de sesión</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Revocar</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : sesiones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No hay sesiones registradas
                </TableCell>
              </TableRow>
            ) : (
              sesiones.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    #{s.id}
                  </TableCell>
                  <TableCell className="font-medium">{s.usuario.usuario}</TableCell>
                  <TableCell className="text-sm">{s.usuario.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.creacion).toLocaleString("es-CO", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.lat != null && s.lng != null
                      ? `${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}`
                      : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.activa ? "default" : "secondary"}>
                      {s.activa ? "Activa" : "Revocada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {s.activa && (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Revocar sesión"
                        onClick={() => revocar.mutate(s.id)}
                        disabled={revocar.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function AdministracionClient() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Administración</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Gestión de usuarios del sistema y sesiones activas
        </p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="sesiones">Sesiones activas</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <UsuariosTab />
        </TabsContent>

        <TabsContent value="sesiones" className="mt-4">
          <SesionesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
