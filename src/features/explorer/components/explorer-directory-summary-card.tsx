import { Loader2 } from "lucide-react"
import type { ExplorerSizeResult } from "@/shared/api/contracts/explorer"
import type { AppMessages } from "@/shared/i18n/messages/types"
import { formatBytes } from "@/features/explorer/lib/display-utils"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Card as UICard, CardContent as UICardContent } from "@/shared/components/ui/card"

interface ExplorerDirectorySummaryCardProps {
  messages: AppMessages
  locale: string
  inspectDirectoryPath: string
  isLoading: boolean
  data?: ExplorerSizeResult
  onClear: () => void
}

function ExplorerDirectorySummaryCard({
  messages,
  locale,
  inspectDirectoryPath,
  isLoading,
  data,
  onClear,
}: ExplorerDirectorySummaryCardProps) {
  return (
    <UICard className="app-workspace-card">
      <UICardContent className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="text-[12px] font-bold text-[color:var(--app-text-soft)]">{messages.explorer.summary()}</div>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-[color:var(--app-text-soft)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              {messages.explorer.calculatingDirectorySummary()}
            </div>
          ) : data ? (
            <>
              <div className="text-[13px] font-bold text-[color:var(--app-text)]">
                {inspectDirectoryPath.split("/").at(-1) || "/"}
              </div>
              <div className="text-sm text-[color:var(--app-text-soft)]">
                {messages.explorer.path()}: {inspectDirectoryPath}
              </div>
              <div className="text-sm text-[color:var(--app-text)]">
                {messages.explorer.files()}: {data.count ?? "-"}
              </div>
              <div className="text-sm text-[color:var(--app-text)]">
                {messages.explorer.bytes()}: {formatBytes(data.bytes, locale)}
              </div>
              {(data.sizeless ?? 0) > 0 ? (
                <div className="text-sm text-[color:var(--app-text-soft)]">
                  {messages.explorer.sizeless()}: {data.sizeless}
                </div>
              ) : null}
              <div className="pt-1">
                <UIButton size="sm" variant="secondary" onClick={onClear}>
                  {messages.common.clear()}
                </UIButton>
              </div>
            </>
          ) : (
            <div className="text-sm text-[color:var(--app-text-soft)]">No summary reported for this directory.</div>
          )}
        </div>
      </UICardContent>
    </UICard>
  )
}

export { ExplorerDirectorySummaryCard }
