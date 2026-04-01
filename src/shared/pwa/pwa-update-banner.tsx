import { useEffect, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { useI18n } from "@/shared/i18n"
import {
  activatePwaUpdate,
  hasPendingPwaUpdate,
  subscribeToPwaUpdate,
} from "@/shared/pwa/pwa-manager"

function PwaUpdateBanner() {
  const { messages } = useI18n()
  const [visible, setVisible] = useState(() => hasPendingPwaUpdate())

  useEffect(() => {
    return subscribeToPwaUpdate(() => {
      setVisible(true)
    })
  }, [])

  if (!visible) {
    return null
  }

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-4 z-[450] flex justify-center">
      <div className="pointer-events-auto flex w-full max-w-[520px] items-center justify-between gap-4 rounded-[14px] border border-[color:var(--app-warning-border)] bg-[color:var(--app-warning-bg)] px-4 py-3 text-[color:var(--app-warning-text)] shadow-[var(--app-shadow)]">
        <div className="min-w-0">
          <p className="text-sm font-semibold">{messages.common.updateAvailable()}</p>
          <p className="mt-1 text-sm leading-5">{messages.common.updateAvailableMessage()}</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="shrink-0"
          onClick={() => {
            activatePwaUpdate()
          }}
        >
          {messages.common.refreshToUpdate()}
        </Button>
      </div>
    </div>
  )
}

export { PwaUpdateBanner }
