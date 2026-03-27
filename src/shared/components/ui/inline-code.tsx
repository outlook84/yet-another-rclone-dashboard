import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/shared/lib/cn"

function InlineCode({ className, ...props }: ComponentPropsWithoutRef<"code">) {
  return (
    <code
      className={cn(
        "rounded-[6px] border border-[color:var(--app-border)] bg-[color:var(--app-inline-code-bg)] px-1.5 py-0.5 font-mono text-[0.92em] text-[color:var(--app-text)]",
        className,
      )}
      {...props}
    />
  )
}

export { InlineCode }
