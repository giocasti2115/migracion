import { ArrowDown, ArrowUp, LucideIcon } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface KPICardProps {
  title: string
  value: number
  icon: LucideIcon
  trend?: number // positive = up, negative = down (percentage)
  className?: string
}

export function KPICard({ title, value, icon: Icon, trend, className }: KPICardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value.toLocaleString("es-CO")}</p>
        {trend !== undefined && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              trend >= 0 ? "text-green-600" : "text-red-600"
            )}
          >
            {trend >= 0 ? (
              <ArrowUp className="h-3 w-3" />
            ) : (
              <ArrowDown className="h-3 w-3" />
            )}
            {Math.abs(trend)}% vs mes anterior
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export function KPICardSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-8 rounded-md" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-20" />
        <Skeleton className="mt-1 h-3 w-28" />
      </CardContent>
    </Card>
  )
}
