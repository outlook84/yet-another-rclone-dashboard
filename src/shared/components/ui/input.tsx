import type { InputHTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

function Input({ className, type = "text", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type={type}
      className={cn(
        "h-11 w-full rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 text-sm text-[color:var(--app-text)] outline-none transition-[border-color,background-color] focus:border-[color:var(--app-interactive-selected-border)] focus:bg-[color:var(--app-menu-bg)] focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  )
}

export { Input }
