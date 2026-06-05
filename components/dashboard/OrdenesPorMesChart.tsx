"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface OrdenesPorMesChartProps {
  data: { mes: string; total: number }[]
}

function formatMes(mes: string): string {
  const [year, month] = mes.split("-")
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleDateString("es-CO", { month: "short", year: "2-digit" })
}

export function OrdenesPorMesChart({ data }: OrdenesPorMesChartProps) {
  const formatted = data.map((d) => ({ ...d, mes: formatMes(d.mes) }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Órdenes por mes</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(v: number) => [v, "Órdenes"]}
            />
            <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function OrdenesPorMesChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
      </CardContent>
    </Card>
  )
}
