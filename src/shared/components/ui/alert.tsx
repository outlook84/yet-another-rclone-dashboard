import type { HTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

function Alert({
  className,
  variant = "error",
  ...props
}: HTMLAttributes<HTMLDivElement> & { variant?: "error" | "warning" | "success" }) {
  return (
    <div
      className={cn(
        "rounded-[10px] border px-4 py-3 text-sm shadow-[var(--app-shadow-soft)]",
        variant === "warning"
          ? "border-[color:var(--app-warning-border)] bg-[color:var(--app-warning-bg)] text-[color:var(--app-warning-text)]"
          : variant === "success"
            ? "border-[color:var(--app-success-border)] bg-[color:var(--app-success-bg)] text-[color:var(--app-success-text)]"
            : "border-[color:var(--app-danger-border)] bg-[color:var(--app-danger-bg)] text-[color:var(--app-danger-text)]",
        className,
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn("mb-1 text-sm font-bold", className)} {...props} />
}

function AlertDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("m-0 text-sm leading-6", className)} {...props} />
}

export { Alert, AlertDescription, AlertTitle }
