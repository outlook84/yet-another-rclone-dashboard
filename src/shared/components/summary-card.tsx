import type { ReactNode } from "react"
import { Card, CardContent } from "@/shared/components/ui/card"
import { cn } from "@/shared/lib/cn"

interface SummaryCardProps {
  label: string
  value: ReactNode
  size?: "sm" | "md"
  className?: string
}

function SummaryCard({ label, value, size = "md", className }: SummaryCardProps) {
  return (
    <Card className={className}>
      <CardContent className={cn("p-3", size === "md" ? "p-3.5" : "p-3")}>
        <div className="text-sm font-medium leading-5 text-[color:var(--app-text-soft)]">{label}</div>
        <div className={cn("mt-1.5 font-bold leading-6 text-[color:var(--app-text)]", size === "md" ? "text-base" : "text-sm")}>
          {value}
        </div>
      </CardContent>
    </Card>
  )
}

export { SummaryCard }
