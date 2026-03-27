import { Loader2 } from "lucide-react"
import { cn } from "@/shared/lib/cn"

type LoadingStateProps = {
  message: string
  className?: string
}

function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div className={cn("flex items-center gap-2 text-sm text-[color:var(--app-text-soft)]", className)}>
      <Loader2 className="h-4 w-4 animate-spin" />
      {message}
    </div>
  )
}

export { LoadingState }
