import { Loader2 } from "lucide-react"
import type { PendingTransferAction } from "@/features/explorer/store/explorer-ui-store"
import type { AppMessages } from "@/shared/i18n/messages/types"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Card as UICard, CardContent as UICardContent } from "@/shared/components/ui/card"

interface ExplorerPendingTransferCardProps {
  messages: AppMessages
  currentRemote: string
  pendingTransferAction: NonNullable<PendingTransferAction>
  pendingTransferLoading: boolean
  sourceLabel: string
  destinationLabel: string
  onApply: () => void | Promise<void>
  onCancel: () => void
}

function ExplorerPendingTransferCard({
  messages,
  currentRemote,
  pendingTransferAction,
  pendingTransferLoading,
  sourceLabel,
  destinationLabel,
  onApply,
  onCancel,
}: ExplorerPendingTransferCardProps) {
  return (
    <UICard className="app-workspace-card">
      <UICardContent className="px-3 py-3">
        <div className="flex flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-[13px] font-bold text-[color:var(--app-text)]">
              {pendingTransferAction.mode === "sync"
                ? messages.explorer.syncPending()
                : pendingTransferAction.mode === "copy"
                  ? messages.explorer.copyPending()
                  : messages.explorer.movePending()}{" "}
              - {messages.explorer.pendingActionHint()}
            </div>
            <div className="flex items-center gap-2">
              <UIButton size="sm" disabled={!currentRemote.trim()} onClick={onApply}>
                {pendingTransferLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {messages.explorer.applyHere()}
              </UIButton>
              <UIButton size="sm" variant="secondary" onClick={onCancel}>
                {messages.common.cancel()}
              </UIButton>
            </div>
          </div>
          <div className="text-sm text-[color:var(--app-text-soft)]">
            {messages.explorer.source()}: {sourceLabel}
          </div>
          <div className="text-sm text-[color:var(--app-text-soft)]">
            {messages.explorer.destination()}: {destinationLabel}
          </div>
        </div>
      </UICardContent>
    </UICard>
  )
}

export { ExplorerPendingTransferCard }
