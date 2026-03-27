import type { HTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel)]",
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1 p-3.5", className)} {...props} />
}

function CardTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-medium leading-5 text-[color:var(--app-text)]", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-[color:var(--app-text-soft)]", className)} {...props} />
}

function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-3.5 pt-0", className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
