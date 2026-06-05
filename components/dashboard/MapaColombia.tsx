"use client"

import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps"
import { scaleQuantile } from "d3-scale"
import { Tooltip } from "@/components/ui/tooltip"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Colombia GeoJSON — download from naturalearth or use the one in public/geo/
// The file must exist at /public/geo/colombia-departamentos.json
const GEO_URL = "/geo/colombia-departamentos.json"

interface MapaDato {
  codigoDane: string
  departamento: string
  total: number
}

interface MapaColombiaProps {
  data: MapaDato[]
}

export function MapaColombia({ data }: MapaColombiaProps) {
  const totals = data.map((d) => d.total)
  const colorScale = scaleQuantile<string>()
    .domain(totals)
    .range([
      "#dbeafe",
      "#93c5fd",
      "#3b82f6",
      "#1d4ed8",
      "#1e3a8a",
    ])

  const dataMap = new Map(data.map((d) => [d.codigoDane, d]))

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="text-base">Órdenes por departamento (últimos 12 meses)</CardTitle>
      </CardHeader>
      <CardContent>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{ scale: 2000, center: [-74, 4] }}
          style={{ width: "100%", height: "320px" }}
        >
          <ZoomableGroup>
            <Geographies geography={GEO_URL}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  const codigo = geo.properties.DPTO ?? geo.properties.codigo
                  const dato = dataMap.get(String(codigo).padStart(2, "0"))
                  return (
                    <Geography
                      key={geo.rsmKey}
                      geography={geo}
                      fill={dato ? colorScale(dato.total) : "#e2e8f0"}
                      stroke="#fff"
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#f59e0b", outline: "none", cursor: "pointer" },
                        pressed: { outline: "none" },
                      }}
                      aria-label={dato ? `${dato.departamento}: ${dato.total} órdenes` : "Sin datos"}
                    />
                  )
                })
              }
            </Geographies>
          </ZoomableGroup>
        </ComposableMap>
        {/* Legend */}
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Menor</span>
          <div className="flex flex-1 gap-0.5">
            {["#dbeafe", "#93c5fd", "#3b82f6", "#1d4ed8", "#1e3a8a"].map((c) => (
              <div key={c} className="h-3 flex-1 rounded-sm" style={{ background: c }} />
            ))}
          </div>
          <span>Mayor</span>
        </div>
      </CardContent>
    </Card>
  )
}

export function MapaColombiaSkeleton() {
  return (
    <Card className="col-span-2">
      <CardHeader>
        <Skeleton className="h-5 w-64" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[320px] w-full" />
      </CardContent>
    </Card>
  )
}
