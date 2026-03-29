import { ChevronDown, ChevronUp, X } from "lucide-react"
import { useEffect, useRef } from "react"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Button } from "@/shared/components/ui/button"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { useI18n } from "@/shared/i18n"
import { formatBackendText, formatLocalizedDurationShort, hasBackendText } from "@/shared/i18n/formatters"
import { formatBytes } from "@/features/explorer/lib/display-utils"
import { useUploadCenterStore } from "@/features/uploads/store/upload-center-store"

const UPLOAD_CENTER_MARGIN = 16
const UPLOAD_CENTER_PREVIEW_GAP = 12
const MINIMIZED_MEDIA_PREVIEW_HEIGHT = 40

function clampProgress(value: number) {
  if (!Number.isFinite(value)) {
    return 0
  }

  return Math.min(Math.max(value, 0), 1)
}

function formatPercent(value: number) {
  const clamped = clampProgress(value)
  if (clamped >= 1) {
    return "100%"
  }
  return `${Math.floor(clamped * 1000) / 10}%`
}

function IndeterminateProgressBar() {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-[color:var(--app-hover-surface)]">
      <div className="h-full w-[38%] animate-[upload-indeterminate_1.2s_ease-in-out_infinite] rounded-full bg-[color:var(--app-accent)]" />
    </div>
  )
}

function getUploadSpeedBytesPerSecond(startedAt: string, uploadedBytes: number, lastProgressAt: string) {
  const startedMs = new Date(startedAt).getTime()
  const lastProgressMs = new Date(lastProgressAt).getTime()
  if (!Number.isFinite(startedMs) || !Number.isFinite(lastProgressMs)) {
    return null
  }

  const elapsedSeconds = Math.max((lastProgressMs - startedMs) / 1000, 0)
  if (elapsedSeconds <= 0 || uploadedBytes <= 0) {
    return null
  }

  return uploadedBytes / elapsedSeconds
}

function GlobalUploadCenter() {
  const { locale, messages } = useI18n()
  const compactMediaPreview = useMediaQuery("(max-width: 48em)")
  const mediaPreview = useExplorerUIStore((state) =>
    state.scopeKey ? state.actionsByScope[state.scopeKey]?.mediaPreview ?? null : null,
  )
  const mediaPreviewMinimized = useExplorerUIStore((state) =>
    state.scopeKey ? state.actionsByScope[state.scopeKey]?.mediaPreviewMinimized ?? false : false,
  )
  const mediaPreviewSizes = useExplorerUIStore((state) => state.mediaPreviewSizes)
  const setMediaPreviewMinimized = useExplorerUIStore((state) => state.setMediaPreviewMinimized)
  const tasks = useUploadCenterStore((state) => state.tasks)
  const collapsed = useUploadCenterStore((state) => state.collapsed)
  const collapse = useUploadCenterStore((state) => state.collapse)
  const expand = useUploadCenterStore((state) => state.expand)
  const cancelTask = useUploadCenterStore((state) => state.cancelTask)
  const removeTask = useUploadCenterStore((state) => state.removeTask)
  const clearCompletedTasks = useUploadCenterStore((state) => state.clearCompletedTasks)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const activeCount = tasks.filter((task) => task.status === "uploading").length
  const completedCount = tasks.filter((task) => task.status === "success").length
  const bottomOffset =
    mediaPreview
      ? mediaPreviewMinimized
        ? UPLOAD_CENTER_MARGIN + MINIMIZED_MEDIA_PREVIEW_HEIGHT + UPLOAD_CENTER_PREVIEW_GAP
        : !compactMediaPreview
          ? UPLOAD_CENTER_MARGIN + mediaPreviewSizes[mediaPreview.layout].height + UPLOAD_CENTER_PREVIEW_GAP
          : UPLOAD_CENTER_MARGIN
      : UPLOAD_CENTER_MARGIN
  const floatingPositionStyle = {
    bottom: `${bottomOffset}px`,
    right: `${UPLOAD_CENTER_MARGIN}px`,
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (
          target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) ||
          target.closest("[role='dialog'], [role='menu']")
        )
      ) {
        return
      }

      if (event.key !== "Escape" || collapsed || tasks.length === 0) {
        return
      }

      event.preventDefault()
      collapse()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [collapse, collapsed, tasks.length])

  useEffect(() => {
    if (!collapsed && mediaPreview && !compactMediaPreview && !mediaPreviewMinimized) {
      setMediaPreviewMinimized(true)
    }
  }, [collapsed, compactMediaPreview, mediaPreview, mediaPreviewMinimized, setMediaPreviewMinimized])

  if (tasks.length === 0) {
    return null
  }

  if (compactMediaPreview && mediaPreview && !mediaPreviewMinimized) {
    return null
  }

  if (collapsed) {
    return (
      <div className="fixed z-40" style={floatingPositionStyle}>
        <Button
          variant="secondary"
          className="h-10 rounded-full border border-[color:var(--app-border)] px-4 shadow-[0_14px_30px_rgba(0,0,0,0.12)]"
          onClick={() => {
            if (mediaPreview && !compactMediaPreview && !mediaPreviewMinimized) {
              setMediaPreviewMinimized(true)
            }
            expand()
          }}
        >
          <ChevronUp className="mr-2 h-4 w-4" />
          {messages.explorer.showUploads(activeCount, tasks.length)}
        </Button>
      </div>
    )
  }

  return (
    <div
      ref={panelRef}
      className="fixed z-40 w-[min(420px,calc(100vw-2rem))]"
      style={floatingPositionStyle}
    >
      <Card className="border-[color:var(--app-border)] shadow-[0_20px_48px_rgba(0,0,0,0.16)]">
        <CardContent className="p-0">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--app-border)] px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm font-bold text-[color:var(--app-text)]">
                <span>{messages.explorer.uploads()}</span>
                {activeCount > 0 ? (
                  <span className="rounded-full bg-[color:var(--app-hover-surface)] px-2 py-0.5 text-xs font-normal text-[color:var(--app-text-soft)]">
                    {messages.explorer.uploadsDescription(activeCount, tasks.length)}
                  </span>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={completedCount === 0}
                onClick={clearCompletedTasks}
              >
                {messages.explorer.clearCompletedUploads()}
              </Button>
              <Button variant="ghost" size="icon" onClick={collapse} aria-label={messages.explorer.collapseUploads()}>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto">
            {tasks.map((task) => {
              const fullLocationLabel = `${task.remote}:${task.path || "/"}`
              const overallProgress = task.totalBytes > 0 ? clampProgress(task.uploadedBytes / task.totalBytes) : 0
              const isUploading = task.status === "uploading"
              const hasReliableProgress = task.progressEventCount >= 2
              const shouldShowProgressDetails =
                isUploading
                  ? hasReliableProgress
                  : task.status !== "success" || hasReliableProgress
              const speedBytesPerSecond = getUploadSpeedBytesPerSecond(task.startedAt, task.uploadedBytes, task.lastProgressAt)
              const remainingSeconds =
                isUploading && hasReliableProgress && speedBytesPerSecond && speedBytesPerSecond > 0
                  ? Math.max((task.totalBytes - task.uploadedBytes) / speedBytesPerSecond, 0)
                  : null
              const isProcessingOnServer =
                isUploading && task.uploadedBytes >= task.totalBytes && task.totalBytes > 0
              const statusLabel =
                task.status === "uploading"
                  ? isProcessingOnServer
                    ? messages.explorer.processingStatus()
                    : messages.explorer.uploadingStatus()
                  : task.status === "success"
                    ? messages.explorer.uploadCompleteStatus()
                    : task.status === "cancelled"
                      ? messages.explorer.uploadCancelledStatus()
                      : messages.explorer.uploadFailedStatus()

              return (
                <div key={task.id} className="border-b border-[color:var(--app-border)] px-4 py-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <div
                          className="truncate text-sm font-bold text-[color:var(--app-text)]"
                          title={fullLocationLabel}
                          aria-label={fullLocationLabel}
                        >
                          {fullLocationLabel}
                        </div>
                      <div className="mt-1 text-xs text-[color:var(--app-text-soft)]">
                        {messages.explorer.uploadTaskSummary(task.fileCount, statusLabel)}
                      </div>
                    </div>
                    {isUploading ? (
                      <Button variant="outline" size="sm" className="shrink-0" onClick={() => cancelTask(task.id)}>
                        {messages.explorer.cancelUpload()}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0"
                        onClick={() => removeTask(task.id)}
                        aria-label={messages.explorer.dismissUpload()}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {isUploading && !hasReliableProgress ? (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--app-text-soft)]">
                          <span>{messages.explorer.indeterminateProgress()}</span>
                          <span>{formatBytes(task.uploadedBytes, locale)}</span>
                        </div>
                        <IndeterminateProgressBar />
                      </div>
                    ) : shouldShowProgressDetails ? (
                      <>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--app-text-soft)]">
                            <span>{messages.explorer.overallProgress()}</span>
                            <span>{formatPercent(overallProgress)}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-[color:var(--app-hover-surface)]">
                            <div
                              className="h-full rounded-full bg-[color:var(--app-accent)] transition-[width]"
                              style={{ width: `${overallProgress * 100}%` }}
                            />
                          </div>
                        </div>
                      </>
                    ) : null}
                    <div className="flex items-center justify-between gap-3 text-xs text-[color:var(--app-text-soft)]">
                      <span className="truncate">{task.currentFileName ?? task.fileNames.at(-1) ?? ""}</span>
                      <span className="shrink-0">
                        {formatBytes(task.uploadedBytes, locale)} / {formatBytes(task.totalBytes, locale)}
                      </span>
                    </div>
                    {shouldShowProgressDetails ? (
                      <>
                    <div className="flex items-center justify-between gap-4 text-xs text-[color:var(--app-text-soft)]">
                      <span className="min-w-0 truncate">
                        {messages.explorer.uploadSpeed()}:{" "}
                        {hasReliableProgress && speedBytesPerSecond ? `${formatBytes(speedBytesPerSecond, locale)}/s` : "-"}
                      </span>
                      <span className="shrink-0">
                        {messages.explorer.estimatedTimeRemaining()}:{" "}
                        {remainingSeconds !== null ? formatLocalizedDurationShort(remainingSeconds, locale) : "-"}
                      </span>
                    </div>
                      </>
                    ) : null}
                    {isUploading && !hasReliableProgress ? (
                      <div className="text-xs text-[color:var(--app-text-soft)]">
                        {messages.explorer.waitingForProgress()}
                      </div>
                    ) : null}
                    {hasBackendText(task.errorMessage ?? undefined) ? (
                      <div className="text-xs text-[color:var(--app-danger-text)]">{formatBackendText(task.errorMessage ?? undefined)}</div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export { GlobalUploadCenter }
