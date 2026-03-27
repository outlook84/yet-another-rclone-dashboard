import { cva, type VariantProps } from "class-variance-authority"
import type { HTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-normal",
  {
    variants: {
      variant: {
        default:
          "border-[color:color-mix(in_srgb,var(--app-accent)_18%,transparent)] bg-[rgba(37,99,235,0.1)] text-[color:var(--app-accent-strong)]",
        success:
          "border-[color:var(--app-success-border)] bg-[color:var(--app-success-badge-bg)] text-[color:var(--app-success-badge-text)]",
        warning:
          "border-[color:var(--app-warning-border)] bg-[color:var(--app-warning-badge-bg)] text-[color:var(--app-warning-badge-text)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface BadgeProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge }
