"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface DisponibilidadData {
  disponibles: number
  enMantenimiento: number
  inactivos: number
}

interface DisponibilidadChartProps {
  data: DisponibilidadData
}

export function DisponibilidadChart({ data }: DisponibilidadChartProps) {
  const chartData = [
    {
      estado: "Disponibles",
      cantidad: data.disponibles,
      fill: "hsl(142 71% 45%)",
    },
    {
      estado: "En mtto.",
      cantidad: data.enMantenimiento,
      fill: "hsl(38 92% 50%)",
    },
    {
      estado: "Inactivos",
      cantidad: data.inactivos,
      fill: "hsl(0 72% 51%)",
    },
  ]

  const total = data.disponibles + data.enMantenimiento + data.inactivos
  const disponibilidadPct = total > 0 ? Math.round((data.disponibles / total) * 100) : 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          Disponibilidad de equipos
          <span className="ml-2 text-sm font-normal text-muted-foreground">
            {disponibilidadPct}% disponibles
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
          >
            <XAxis dataKey="estado" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(v: number) => [v, "Equipos"]}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="cantidad" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <rect key={index} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Summary pills */}
        <div className="mt-3 flex gap-3 text-xs">
          {chartData.map((d) => (
            <div key={d.estado} className="flex items-center gap-1">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: d.fill }}
              />
              <span className="text-muted-foreground">{d.estado}:</span>
              <span className="font-medium">{d.cantidad}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export function DisponibilidadChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-52" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
      </CardContent>
    </Card>
  )
}
