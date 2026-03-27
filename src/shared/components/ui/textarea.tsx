import type { TextareaHTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-[220px] w-full rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 py-2 text-sm text-[color:var(--app-text)] outline-none transition-[border-color,background-color] focus:border-[color:var(--app-interactive-selected-border)] focus:bg-[color:var(--app-menu-bg)] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
