import type { ReactNode } from "react"
import { cn } from "@/shared/lib/cn"

type EmptyStateProps = {
  title?: string
  description: ReactNode
  className?: string
}

function EmptyState({ title, description, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-[10px] border border-dashed border-[color:var(--app-border)] app-surface-subtle px-4 py-5 text-sm text-[color:var(--app-text-soft)]",
        className,
      )}
    >
      {title ? <div className="mb-1 text-sm font-bold text-[color:var(--app-text)]">{title}</div> : null}
      <div>{description}</div>
    </div>
  )
}

export { EmptyState }
