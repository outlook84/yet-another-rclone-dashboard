import type { AppMessages } from "@/shared/i18n/messages/types"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Card as UICard, CardContent as UICardContent } from "@/shared/components/ui/card"

interface ExplorerPublicLinkCardProps {
  messages: AppMessages
  publicLink: {
    fileName: string
    url: string
  }
  onCopy: () => void | Promise<void>
  onClear: () => void
}

function ExplorerPublicLinkCard({ messages, publicLink, onCopy, onClear }: ExplorerPublicLinkCardProps) {
  return (
    <UICard>
      <UICardContent className="p-4">
        <div className="flex flex-col gap-3">
          <div className="text-sm font-normal text-[color:var(--app-text-soft)]">{messages.explorer.shareLink()}</div>
          <div className="font-bold text-[color:var(--app-text)]">{publicLink.fileName}</div>
          <div className="text-sm text-[color:var(--app-text-soft)]">{messages.explorer.shareLinkDescription()}</div>
          <input
            readOnly
            value={publicLink.url}
            className="h-11 rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 text-sm text-[color:var(--app-text)] outline-none"
          />
          <div className="flex flex-wrap items-center gap-2">
            <UIButton variant="secondary" onClick={onCopy}>
              {messages.explorer.copyLink()}
            </UIButton>
            <UIButton asChild>
              <a href={publicLink.url} target="_blank" rel="noreferrer">
                {messages.explorer.openLink()}
              </a>
            </UIButton>
            <UIButton variant="secondary" onClick={onClear}>
              {messages.common.clear()}
            </UIButton>
          </div>
        </div>
      </UICardContent>
    </UICard>
  )
}

export { ExplorerPublicLinkCard }
