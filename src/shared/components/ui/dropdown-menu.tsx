import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/shared/lib/cn"

function DropdownMenu(props: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root {...props} />
}

function DropdownMenuTrigger(props: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger {...props} />
}

function DropdownMenuContent({
  className,
  sideOffset = 8,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-[10rem] overflow-hidden rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-menu-bg)] p-1 text-[color:var(--app-text)]",
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  inset,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { inset?: boolean }) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[8px] px-2.5 py-1.5 text-[13px] font-normal outline-none transition-colors focus:bg-[color:var(--app-menu-item-hover)] data-[highlighted]:bg-[color:var(--app-menu-item-hover)] data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        inset && "pl-8",
        className,
      )}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      className={cn("my-1 h-px bg-[color:var(--app-border)]", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
