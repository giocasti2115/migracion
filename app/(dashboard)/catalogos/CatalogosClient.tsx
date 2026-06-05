"use client"

import { useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Pencil, Trash2, Check, X, Plus } from "lucide-react"

// ─── Config ───────────────────────────────────────────────────────────────────

interface CatalogConfig {
  label: string
  slug: string
  /** Name of the main text field returned by the API */
  field: string
  /** Optional second label field (e.g. modelo shows clase+marca too) */
  extraFields?: string[]
}

const CATALOGS: CatalogConfig[] = [
  { label: "Marcas",         slug: "marcas",         field: "marca" },
  { label: "Clases",         slug: "clases",         field: "clase" },
  { label: "Modelos",        slug: "modelos",        field: "modelo",   extraFields: ["idClase", "idMarca"] },
  { label: "Áreas",          slug: "areas",          field: "area" },
  { label: "Tipos",          slug: "tipos",          field: "tipo" },
  { label: "Servicios",      slug: "servicios",      field: "servicio" },
  { label: "Fallas – Modos", slug: "fallas-modos",   field: "modo" },
  { label: "Fallas – Causas",slug: "fallas-causas",  field: "causa" },
  { label: "Fallas – Accs.", slug: "fallas-acciones",field: "accion" },
  { label: "Repuestos",      slug: "repuestos",      field: "nombre" },
  { label: "Protocolos",     slug: "protocolos",     field: "title" },
]

// ─── Generic catalog tab ─────────────────────────────────────────────────────

function CatalogTab({ config, canEdit }: { config: CatalogConfig; canEdit: boolean }) {
  const qc = useQueryClient()
  const [newValue, setNewValue] = useState("")
  const [editId, setEditId]     = useState<number | null>(null)
  const [editValue, setEditValue] = useState("")

  const { data, isLoading } = useQuery<{ data: Record<string, unknown>[] }>({
    queryKey: ["catalogo", config.slug],
    queryFn: async () => {
      const res = await fetch(`/api/catalogos/${config.slug}?pageSize=500`)
      if (!res.ok) throw new Error("Error al cargar catálogo")
      return res.json()
    },
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["catalogo", config.slug] })

  const create = useMutation({
    mutationFn: async () => {
      if (!newValue.trim()) return
      const res = await fetch(`/api/catalogos/${config.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.field]: newValue.trim() }),
      })
      if (!res.ok) throw new Error("Error al crear")
    },
    onSuccess: () => { setNewValue(""); invalidate() },
  })

  const update = useMutation({
    mutationFn: async ({ id, value }: { id: number; value: string }) => {
      const res = await fetch(`/api/catalogos/${config.slug}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [config.field]: value.trim() }),
      })
      if (!res.ok) throw new Error("Error al actualizar")
    },
    onSuccess: () => { setEditId(null); invalidate() },
  })

  const remove = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/catalogos/${config.slug}/${id}`, { method: "DELETE" })
      if (res.status === 409) throw new Error("Este registro está en uso y no puede eliminarse")
      if (!res.ok) throw new Error("Error al eliminar")
    },
    onSuccess: invalidate,
    onError: (e: Error) => alert(e.message),
  })

  const items = data?.data ?? []

  return (
    <div className="space-y-4">
      {canEdit && (
        <form
          onSubmit={(e) => { e.preventDefault(); create.mutate() }}
          className="flex items-center gap-2 max-w-sm"
        >
          <Input
            placeholder={`Nuevo ${config.field}…`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="sm" disabled={!newValue.trim() || create.isPending}>
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </form>
      )}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">ID</TableHead>
              <TableHead>{config.label}</TableHead>
              {canEdit && <TableHead className="w-24 text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                  Sin registros
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => {
                const id = item.id as number
                const value = item[config.field] as string
                const isEditing = editId === id

                return (
                  <TableRow key={id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      #{id}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Input
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="h-7 text-sm"
                          autoFocus
                        />
                      ) : (
                        <span>{value}</span>
                      )}
                      {/* Show activo badge if present */}
                      {"activo" in item && (
                        <Badge
                          variant={(item.activo as boolean) ? "default" : "secondary"}
                          className="ml-2 text-xs"
                        >
                          {(item.activo as boolean) ? "Activo" : "Inactivo"}
                        </Badge>
                      )}
                    </TableCell>
                    {canEdit && (
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isEditing ? (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => update.mutate({ id, value: editValue })}
                                disabled={!editValue.trim() || update.isPending}
                              >
                                <Check className="h-3.5 w-3.5 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => setEditId(null)}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => { setEditId(id); setEditValue(value) }}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => {
                                  if (confirm(`¿Eliminar "${value}"?`)) remove.mutate(id)
                                }}
                                disabled={remove.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">{items.length} registro{items.length !== 1 ? "s" : ""}</p>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CatalogosClient({ canEdit }: { canEdit: boolean }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Catálogos</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Listas de referencia utilizadas en el sistema
          {canEdit ? " — puede agregar, editar y eliminar registros" : " (solo lectura)"}
        </p>
      </div>

      <Tabs defaultValue="marcas">
        <TabsList className="flex-wrap h-auto gap-1">
          {CATALOGS.map((c) => (
            <TabsTrigger key={c.slug} value={c.slug} className="text-xs">
              {c.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATALOGS.map((c) => (
          <TabsContent key={c.slug} value={c.slug} className="mt-4">
            <CatalogTab config={c} canEdit={canEdit} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
