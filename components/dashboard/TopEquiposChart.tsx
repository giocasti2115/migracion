"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

interface TopEquiposChartProps {
  data: { equipo: string; total: number }[]
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(215 70% 55%)",
  "hsl(215 60% 65%)",
  "hsl(215 50% 70%)",
  "hsl(215 40% 78%)",
]

export function TopEquiposChart({ data }: TopEquiposChartProps) {
  // Truncate long names for the axis
  const formatted = data.map((d) => ({
    ...d,
    equipo: d.equipo.length > 22 ? d.equipo.slice(0, 20) + "…" : d.equipo,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 5 equipos con más correctivos</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={formatted}
            layout="vertical"
            margin={{ top: 4, right: 16, left: 4, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
            <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis
              type="category"
              dataKey="equipo"
              tick={{ fontSize: 10 }}
              width={120}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12,
                borderRadius: 6,
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(v: number) => [v, "Órdenes"]}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {formatted.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

export function TopEquiposChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[220px] w-full" />
      </CardContent>
    </Card>
  )
}
