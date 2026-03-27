import type { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react"
import { cn } from "@/shared/lib/cn"

function TableShell({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "app-workspace-card overflow-hidden",
        className,
      )}
      {...props}
    />
  )
}

function TableScroll({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("overflow-x-auto", className)} {...props} />
}

function Table({ className, ...props }: TableHTMLAttributes<HTMLTableElement>) {
  return <table className={cn("min-w-full border-collapse text-[length:var(--app-table-row-size)]", className)} {...props} />
}

function TableHeadRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[color:var(--app-border)] bg-[color:var(--app-table-head-bg)] text-left text-[color:var(--app-text-soft)]",
        className,
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-[color:var(--app-table-row-border)] align-top transition-colors last:border-b-0 hover:bg-[color:var(--app-table-row-hover)]",
        className,
      )}
      {...props}
    />
  )
}

function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "px-4 py-2.5 text-[length:var(--app-table-head-size)] font-normal",
        className,
      )}
      {...props}
    />
  )
}

function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-4 py-3 text-[color:var(--app-text)]", className)} {...props} />
}

export { Table, TableCell, TableHead, TableHeadRow, TableRow, TableScroll, TableShell }
