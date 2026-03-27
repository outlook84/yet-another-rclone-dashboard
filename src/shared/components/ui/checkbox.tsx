import { forwardRef, type InputHTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

const Checkbox = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Checkbox(
  { className, type = "checkbox", ...props },
  ref,
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn(
        "h-4 w-4 rounded-[4px] border border-[color:var(--app-border)] accent-[color:var(--app-accent)] disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  )
})

export { Checkbox }
