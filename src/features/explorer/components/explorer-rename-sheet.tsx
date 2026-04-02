import { Loader2 } from "lucide-react"
import type { PendingRenameAction } from "@/features/explorer/store/explorer-ui-store"
import type { AppMessages } from "@/shared/i18n/messages/types"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"

interface ExplorerRenameSheetProps {
  messages: AppMessages
  pendingRenameAction: PendingRenameAction
  isPending: boolean
  onOpenChange: (open: boolean) => void
  onNextNameChange: (nextName: string) => void
  onSubmit: () => void | Promise<void>
  onCancel: () => void
}

function ExplorerRenameSheet({
  messages,
  pendingRenameAction,
  isPending,
  onOpenChange,
  onNextNameChange,
  onSubmit,
  onCancel,
}: ExplorerRenameSheetProps) {
  return (
    <Sheet open={Boolean(pendingRenameAction)} onOpenChange={onOpenChange}>
      {pendingRenameAction ? (
        <SheetContent
          side="bottom"
          className="left-1/2 right-auto top-1/2 bottom-auto w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border p-4"
        >
          <SheetHeader className="mb-3 pr-8">
            <SheetTitle>{messages.common.rename()}</SheetTitle>
            <SheetDescription className="break-all">{pendingRenameAction.item.itemName}</SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3">
            <input
              autoFocus
              className="h-11 rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 text-sm text-[color:var(--app-text)] outline-none"
              placeholder={messages.explorer.renamePlaceholder()}
              value={pendingRenameAction.nextName}
              onChange={(event) => {
                onNextNameChange(event.currentTarget.value)
              }}
            />
            <div className="flex items-center gap-2">
              <UIButton disabled={!pendingRenameAction.nextName.trim()} onClick={onSubmit}>
                {isPending ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                {messages.common.rename()}
              </UIButton>
              <UIButton variant="secondary" onClick={onCancel}>
                {messages.common.cancel()}
              </UIButton>
            </div>
          </div>
        </SheetContent>
      ) : null}
    </Sheet>
  )
}

export { ExplorerRenameSheet }
