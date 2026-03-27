import * as Dialog from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/shared/lib/cn"

const Sheet = Dialog.Root
const SheetTrigger = Dialog.Trigger
const SheetClose = Dialog.Close

function SheetPortal({ ...props }: Dialog.DialogPortalProps) {
  return <Dialog.Portal {...props} />
}

function SheetOverlay({ className, ...props }: Dialog.DialogOverlayProps) {
  return (
    <Dialog.Overlay
      className={cn("fixed inset-0 z-50 bg-slate-950/40", className)}
      {...props}
    />
  )
}

interface SheetContentProps extends ComponentPropsWithoutRef<typeof Dialog.Content> {
  side?: "left" | "right" | "bottom"
}

function SheetContent({ className, children, side = "left", ...props }: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Dialog.Content
        className={cn(
          "fixed z-50 border-[color:var(--app-border)] bg-[color:var(--app-sheet-bg)] p-4",
          side === "left" && "left-0 top-0 h-full w-[280px] border-r",
          side === "right" && "right-0 top-0 h-full w-[280px] border-l",
          side === "bottom" && "bottom-0 left-0 right-0 rounded-t-[18px] border-t px-4 pb-5 pt-4",
          className,
        )}
        {...props}
      >
        {children}
        <Dialog.Close className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-[color:var(--app-text-soft)] transition-colors hover:bg-[color:var(--app-hover-surface)] hover:text-[color:var(--app-text)]">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </Dialog.Close>
      </Dialog.Content>
    </SheetPortal>
  )
}

function SheetHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("mb-4 flex flex-col gap-1.5", className)} {...props} />
}

function SheetTitle({ className, ...props }: Dialog.DialogTitleProps) {
  return <Dialog.Title className={cn("text-base font-bold", className)} {...props} />
}

function SheetDescription({ className, ...props }: Dialog.DialogDescriptionProps) {
  return <Dialog.Description className={cn("text-sm text-[color:var(--app-text-soft)]", className)} {...props} />
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
}
