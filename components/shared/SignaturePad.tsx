"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

interface SignaturePadProps {
  /** ID of the orden this signature belongs to */
  ordenId: number
  /** Called after the signature is saved successfully */
  onSaved?: (url: string) => void
  /** Called when user cancels */
  onCancel?: () => void
}

/**
 * Canvas-based digital signature pad.
 * Supports mouse and touch drawing. Saves via POST /api/ordenes/[id]/firma.
 */
export function SignaturePad({ ordenId, onSaved, onCancel }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isDrawing = useRef(false)

  const [nombreFirmante, setNombreFirmante] = useState("")
  const [cedulaFirmante, setCedulaFirmante] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  // Initialize canvas background
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = "#1e293b"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"
  }, [])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ("touches" in e) {
      const touch = e.touches[0]
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    isDrawing.current = true
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsEmpty(false)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!isDrawing.current) return
    const ctx = canvasRef.current?.getContext("2d")
    if (!ctx) return
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function stopDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    isDrawing.current = false
  }

  function clearCanvas() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setIsEmpty(true)
  }

  async function handleSave() {
    if (isEmpty) {
      setError("Por favor, dibuje su firma antes de guardar.")
      return
    }
    if (!nombreFirmante.trim()) {
      setError("Ingrese el nombre del firmante.")
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const firmaBase64 = canvas.toDataURL("image/png")

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/ordenes/${ordenId}/firma`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmaBase64,
          nombreFirmante: nombreFirmante.trim(),
          cedulaFirmante: cedulaFirmante.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Error al guardar la firma")
      }

      const { url } = await res.json()
      onSaved?.(url)
    } catch (err: any) {
      setError(err.message ?? "Error inesperado")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Nombre del firmante *</label>
          <input
            type="text"
            value={nombreFirmante}
            onChange={(e) => setNombreFirmante(e.target.value)}
            placeholder="Nombre completo"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-slate-700">Cédula (opcional)</label>
          <input
            type="text"
            value={cedulaFirmante}
            onChange={(e) => setCedulaFirmante(e.target.value)}
            placeholder="Número de cédula"
            className="rounded-md border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium text-slate-700">Firma</label>
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          className="w-full rounded-md border-2 border-dashed border-slate-300 bg-white cursor-crosshair touch-none"
          style={{ maxHeight: 200 }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={stopDraw}
        />
        <p className="text-xs text-slate-500">Dibuje su firma en el recuadro</p>
      </div>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={clearCanvas} disabled={saving}>
          Limpiar
        </Button>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>
            Cancelar
          </Button>
        )}
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? "Guardando..." : "Guardar firma"}
        </Button>
      </div>
    </div>
  )
}
