import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "@radix-ui/react-slot"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

const buttonVariants = cva(
  "inline-flex appearance-none items-center justify-center whitespace-nowrap rounded-[10px] border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-accent)]/35 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "border-[color:var(--app-accent)] bg-[color:var(--app-accent)] text-[color:var(--app-accent-contrast)] hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-strong)]",
        success:
          "border-[color:var(--app-accent)] bg-[color:var(--app-accent)] text-[color:var(--app-accent-contrast)] hover:border-[color:var(--app-accent-strong)] hover:bg-[color:var(--app-accent-strong)]",
        warning:
          "border-[color:var(--app-warning-border)] bg-[color:var(--app-warning-bg)] text-[color:var(--app-warning-text)] hover:border-[color:var(--app-warning-border)] hover:bg-[color:var(--app-warning-badge-bg)]",
        danger:
          "border-[color:var(--app-danger-border)] bg-[color:var(--app-danger-bg)] text-[color:var(--app-danger-text-strong)] hover:border-[color:var(--app-danger-border)] hover:bg-[color:var(--app-danger-hover-bg)]",
        secondary:
          "border-[color:var(--app-button-secondary-border)] bg-[color:var(--app-button-secondary-bg)] text-[color:var(--app-button-secondary-text)] hover:border-[color:var(--app-interactive-selected-border)] hover:bg-[color:var(--app-button-secondary-hover-bg)] hover:text-[color:var(--app-button-secondary-text)]",
        ghost:
          "border-transparent bg-transparent text-[color:var(--app-text-soft)] hover:bg-[color:var(--app-hover-surface)] hover:text-[color:var(--app-text)]",
        outline:
          "border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] text-[color:var(--app-text)] hover:border-[color:var(--app-interactive-selected-border)] hover:bg-[color:var(--app-hover-surface)]",
        subtle:
          "border-transparent bg-transparent text-[color:var(--app-text-soft)] hover:bg-[color:var(--app-hover-surface)] hover:text-[color:var(--app-text)]",
        toolbar:
          "border-[color:var(--app-button-secondary-border)] bg-[color:var(--app-button-secondary-bg)] text-[color:var(--app-text-soft)] hover:border-[color:var(--app-interactive-selected-border)] hover:bg-[color:var(--app-button-secondary-hover-bg)] hover:text-[color:var(--app-text)]",
      },
      size: {
        xs: "h-7 px-2.5 text-[11px] font-normal",
        sm: "h-8 px-3 text-xs font-normal",
        toolbar: "min-h-[26px] rounded-[7px] px-2.5 py-[3px] text-[12px] font-normal leading-[1.2]",
        default: "h-9 px-4 text-sm font-normal",
        lg: "h-10 px-5 text-sm font-normal",
        icon: "h-9 w-9",
        "icon-sm": "h-8 w-8",
        "icon-xs": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
  VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : "button"

  return <Comp className={cn(buttonVariants({ variant, size }), className)} type={type} {...props} />
}

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants }
