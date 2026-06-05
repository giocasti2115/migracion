"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

interface QRScannerProps {
  /** Called when the modal should close */
  onClose?: () => void
}

/**
 * QR scanner that decodes equipment serial numbers.
 * On successful scan, searches for the equipment and navigates to its page.
 * Uses html5-qrcode loaded dynamically to avoid SSR issues.
 */
export function QRScanner({ onClose }: QRScannerProps) {
  const router = useRouter()
  const scannerRef = useRef<any>(null)
  const [status, setStatus] = useState<"scanning" | "searching" | "error" | "idle">("idle")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  useEffect(() => {
    let mounted = true

    async function initScanner() {
      try {
        // Dynamically import to avoid SSR issues
        const { Html5QrcodeScanner, Html5QrcodeScanType } = await import("html5-qrcode")

        if (!mounted) return

        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
          },
          /* verbose= */ false
        )

        scannerRef.current = scanner

        scanner.render(
          async (decodedText: string) => {
            if (!mounted) return

            // Pause scanning while we search
            setStatus("searching")
            setErrorMsg(null)

            try {
              const res = await fetch(
                `/api/equipos?q=${encodeURIComponent(decodedText)}&pageSize=1`
              )
              if (!res.ok) throw new Error("Error al buscar el equipo")

              const data = await res.json()
              const equipos: any[] = data.data ?? data.items ?? data ?? []

              if (equipos.length === 0) {
                setStatus("error")
                setErrorMsg(`No se encontró ningún equipo con el código: "${decodedText}"`)
                setStatus("scanning")
                return
              }

              const equipo = equipos[0]
              scanner.clear().catch(() => {})
              router.push(`/equipos/${equipo.id}`)
              onClose?.()
            } catch (err: any) {
              setStatus("error")
              setErrorMsg(err?.message ?? "Error inesperado al buscar el equipo")
              setStatus("scanning")
            }
          },
          (errorMessage: string) => {
            // Scan errors are frequent (no QR in frame); only log unusual ones
            if (!errorMessage.includes("No MultiFormat Readers")) {
              console.debug("[QRScanner] scan error:", errorMessage)
            }
          }
        )

        setStarted(true)
        setStatus("scanning")
      } catch (err: any) {
        console.error("[QRScanner] init error:", err)
        setErrorMsg("No se pudo inicializar la cámara. Verifique los permisos.")
        setStatus("error")
      }
    }

    initScanner()

    return () => {
      mounted = false
      scannerRef.current?.clear().catch(() => {})
    }
  }, [router, onClose])

  return (
    <div className="flex flex-col gap-4">
      <div id="qr-reader" className="w-full rounded-lg overflow-hidden" />

      {!started && status === "idle" && (
        <p className="text-center text-sm text-slate-500">Iniciando cámara...</p>
      )}

      {status === "searching" && (
        <p className="text-center text-sm text-blue-600 font-medium">
          Buscando equipo...
        </p>
      )}

      {errorMsg && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 text-center">
          {errorMsg}
        </p>
      )}

      <div className="flex justify-center gap-2">
        {onClose && (
          <Button variant="outline" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        )}
      </div>
    </div>
  )
}
