import { IconDownload, IconMinus, IconPhoto, IconPlayerPlay, IconWaveSine, IconX } from "@tabler/icons-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Button as UIButton } from "@/shared/components/ui/button"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { useI18n } from "@/shared/i18n"
import { cn } from "@/shared/lib/cn"
import {
  useExplorerUIStore,
  type MediaPreviewLayout,
  type MediaPreviewState,
} from "@/features/explorer/store/explorer-ui-store"
import { useUploadCenterStore } from "@/features/uploads/store/upload-center-store"

const MEDIA_PREVIEW_MARGIN = 16
const MEDIA_PREVIEW_MINIMIZED_HEIGHT = 40
const MEDIA_PREVIEW_MINIMIZED_WIDTH = 240
const MIN_MEDIA_PREVIEW_WIDTH = 320
const MAX_MEDIA_PREVIEW_WIDTH = 960
const MIN_MEDIA_PREVIEW_HEIGHT = 220
const MAX_MEDIA_PREVIEW_HEIGHT = 720
const MEDIA_PREVIEW_HEADER_HEIGHT = 41

function getMediaPreviewViewportBudget() {
  const availableWidth =
    typeof window === "undefined"
      ? MAX_MEDIA_PREVIEW_WIDTH
      : Math.max(280, Math.floor(window.innerWidth - MEDIA_PREVIEW_MARGIN * 2))
  const availableHeight =
    typeof window === "undefined"
      ? MAX_MEDIA_PREVIEW_HEIGHT
      : Math.max(180, Math.floor(window.innerHeight - MEDIA_PREVIEW_MARGIN * 2))

  return {
    availableWidth,
    availableHeight,
  }
}

function clampMediaPreviewSize(width: number, height: number, layout: MediaPreviewLayout) {
  const { availableWidth, availableHeight } = getMediaPreviewViewportBudget()
  const minWidth = Math.min(MIN_MEDIA_PREVIEW_WIDTH, availableWidth)
  const minHeight = Math.min(MIN_MEDIA_PREVIEW_HEIGHT, availableHeight)
  const maxHeight =
    layout === "video-portrait"
      ? Math.min(MAX_MEDIA_PREVIEW_HEIGHT, availableHeight - 24)
      : MAX_MEDIA_PREVIEW_HEIGHT

  return {
    width: Math.min(availableWidth, MAX_MEDIA_PREVIEW_WIDTH, Math.max(minWidth, Math.round(width))),
    height: Math.min(availableHeight, maxHeight, Math.max(minHeight, Math.round(height))),
  }
}

function getDefaultMediaPreviewLayout(kind: NonNullable<MediaPreviewState>["kind"]): MediaPreviewLayout {
  if (kind === "audio") {
    return "audio"
  }

  return kind === "image" ? "image-landscape" : "video-landscape"
}

function getMediaPreviewLayoutFromDimensions(
  kind: NonNullable<MediaPreviewState>["kind"],
  width: number,
  height: number,
): MediaPreviewLayout {
  if (kind === "audio") {
    return "audio"
  }

  if (width <= 0 || height <= 0) {
    return getDefaultMediaPreviewLayout(kind)
  }

  const isPortrait = height > width

  if (kind === "image") {
    return isPortrait ? "image-portrait" : "image-landscape"
  }

  return isPortrait ? "video-portrait" : "video-landscape"
}

function MinimizedRestoreIcon({ kind }: { kind: NonNullable<MediaPreviewState>["kind"] }) {
  if (kind === "image") {
    return <IconPhoto size={14} stroke={1.8} />
  }

  if (kind === "audio") {
    return <IconWaveSine size={14} stroke={1.8} />
  }

  return <IconPlayerPlay size={14} stroke={1.8} />
}

function MediaPreviewOverlay() {
  const { messages } = useI18n()
  const compactMediaPreview = useMediaQuery("(max-width: 48em)")
  const mediaPreview = useExplorerUIStore((state) =>
    state.scopeKey ? state.actionsByScope[state.scopeKey]?.mediaPreview ?? null : null,
  )
  const displayFileName = mediaPreview?.fileName ?? ""
  const setMediaPreview = useExplorerUIStore((state) => state.setMediaPreview)
  const mediaPreviewMinimized = useExplorerUIStore((state) =>
    state.scopeKey ? state.actionsByScope[state.scopeKey]?.mediaPreviewMinimized ?? false : false,
  )
  const setMediaPreviewMinimized = useExplorerUIStore((state) => state.setMediaPreviewMinimized)
  const mediaPreviewSizes = useExplorerUIStore((state) => state.mediaPreviewSizes)
  const setMediaPreviewSize = useExplorerUIStore((state) => state.setMediaPreviewSize)
  const setUploadCenterCollapsed = useUploadCenterStore((state) => state.setCollapsed)
  const [titleVisibleForPath, setTitleVisibleForPath] = useState<string | null>(null)
  const mediaPreviewResizeStateRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    startWidth: number
    startHeight: number
  } | null>(null)

  const currentMediaPreviewStoredSize = useMemo(() => {
    if (!mediaPreview) {
      return mediaPreviewSizes["video-landscape"]
    }

    return mediaPreviewSizes[mediaPreview.layout]
  }, [mediaPreview, mediaPreviewSizes])

  const resolvedMediaPreviewSize = useMemo(
    () =>
      clampMediaPreviewSize(
        currentMediaPreviewStoredSize.width,
        currentMediaPreviewStoredSize.height,
        mediaPreview?.layout ?? "video-landscape",
      ),
    [currentMediaPreviewStoredSize.height, currentMediaPreviewStoredSize.width, mediaPreview?.layout],
  )

  const mediaPreviewBodyHeight = useMemo(
    () => Math.max(120, resolvedMediaPreviewSize.height - MEDIA_PREVIEW_HEADER_HEIGHT),
    [resolvedMediaPreviewSize.height],
  )

  const updateMediaPreviewLayout = useCallback(
    (
      kind: NonNullable<MediaPreviewState>["kind"],
      width: number,
      height: number,
    ) => {
      const nextLayout = getMediaPreviewLayoutFromDimensions(kind, width, height)
      setMediaPreview((current) => {
        if (!current || current.kind !== kind || current.layout === nextLayout) {
          return current
        }

        return {
          ...current,
          layout: nextLayout,
        }
      })
    },
    [setMediaPreview],
  )

  useEffect(() => {
    if (compactMediaPreview) {
      return
    }

    const syncMediaPreviewSize = () => {
      if (!mediaPreview) {
        return
      }

      const nextSize = clampMediaPreviewSize(
        currentMediaPreviewStoredSize.width,
        currentMediaPreviewStoredSize.height,
        mediaPreview.layout,
      )

      if (
        nextSize.width !== currentMediaPreviewStoredSize.width ||
        nextSize.height !== currentMediaPreviewStoredSize.height
      ) {
        setMediaPreviewSize(mediaPreview.layout, nextSize)
      }
    }

    syncMediaPreviewSize()
    window.addEventListener("resize", syncMediaPreviewSize)

    return () => {
      window.removeEventListener("resize", syncMediaPreviewSize)
    }
  }, [
    compactMediaPreview,
    currentMediaPreviewStoredSize.height,
    currentMediaPreviewStoredSize.width,
    mediaPreview,
    setMediaPreviewSize,
  ])

  useEffect(() => {
    if (!mediaPreview || compactMediaPreview) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = mediaPreviewResizeStateRef.current
      if (!resizeState || resizeState.pointerId !== event.pointerId) {
        return
      }

      setMediaPreviewSize(
        mediaPreview.layout,
        clampMediaPreviewSize(
          resizeState.startWidth - (event.clientX - resizeState.startX),
          resizeState.startHeight - (event.clientY - resizeState.startY),
          mediaPreview.layout,
        ),
      )
    }

    const clearResizeState = () => {
      mediaPreviewResizeStateRef.current = null
    }

    window.addEventListener("pointermove", handlePointerMove)
    window.addEventListener("pointerup", clearResizeState)
    window.addEventListener("pointercancel", clearResizeState)

    return () => {
      window.removeEventListener("pointermove", handlePointerMove)
      window.removeEventListener("pointerup", clearResizeState)
      window.removeEventListener("pointercancel", clearResizeState)
      mediaPreviewResizeStateRef.current = null
    }
  }, [compactMediaPreview, mediaPreview, setMediaPreviewSize])

  if (!mediaPreview) {
    return null
  }

  const isMediaPreviewTitleVisible = !compactMediaPreview && titleVisibleForPath === mediaPreview.path

  if (mediaPreviewMinimized) {
    return (
      <div
        className="pointer-events-none fixed z-40"
        style={{
          right: MEDIA_PREVIEW_MARGIN,
          bottom: MEDIA_PREVIEW_MARGIN,
          width: MEDIA_PREVIEW_MINIMIZED_WIDTH,
          maxWidth: `calc(100vw - ${MEDIA_PREVIEW_MARGIN * 2}px)`,
          height: MEDIA_PREVIEW_MINIMIZED_HEIGHT,
        }}
      >
        <div className="pointer-events-auto flex h-full items-center gap-2 rounded-full border border-[color:var(--app-border)] bg-[color:var(--app-sheet-bg)] px-3 shadow-[0_18px_40px_rgba(8,15,28,0.28)]">
          <button
            type="button"
            className="min-w-0 flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-bold text-[color:var(--app-text)]"
            aria-label={messages.explorer.restorePreview()}
            title={displayFileName}
            onClick={() => {
              setUploadCenterCollapsed(true)
              setMediaPreviewMinimized(false)
            }}
          >
            {displayFileName}
          </button>
          <UIButton
            size="icon-xs"
            variant="ghost"
            aria-label={messages.explorer.restorePreview()}
            title={messages.explorer.restorePreview()}
            onClick={() => {
              setUploadCenterCollapsed(true)
              setMediaPreviewMinimized(false)
            }}
          >
            <MinimizedRestoreIcon kind={mediaPreview.kind} />
          </UIButton>
          <UIButton
            size="icon-xs"
            variant="ghost"
            aria-label={messages.common.close()}
            title={messages.common.close()}
            onClick={() => {
              setTitleVisibleForPath(null)
              setMediaPreview(null)
            }}
          >
            <IconX size={14} stroke={1.8} />
          </UIButton>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "pointer-events-none fixed z-40",
        compactMediaPreview ? "inset-0" : "",
      )}
      style={
        compactMediaPreview
          ? undefined
          : {
              right: MEDIA_PREVIEW_MARGIN,
              bottom: MEDIA_PREVIEW_MARGIN,
              width: resolvedMediaPreviewSize.width,
              height: resolvedMediaPreviewSize.height,
              maxWidth: `calc(100vw - ${MEDIA_PREVIEW_MARGIN * 2}px)`,
              maxHeight: `calc(100vh - ${MEDIA_PREVIEW_MARGIN * 2}px)`,
            }
      }
    >
      <div
        className={cn(
          "pointer-events-auto relative h-full w-full border border-[color:var(--app-border)] bg-[color:var(--app-sheet-bg)] shadow-[0_24px_64px_rgba(8,15,28,0.42)]",
          compactMediaPreview ? "flex h-full flex-col" : "overflow-hidden",
        )}
      >
        {!compactMediaPreview ? (
          <button
            type="button"
            aria-label={messages.explorer.resizePreview()}
            className="absolute left-0 top-0 z-10 h-7 w-7 cursor-nwse-resize rounded-br-[10px] text-[color:var(--app-text-soft)] opacity-60 transition-[opacity,color] hover:text-[color:var(--app-text)] hover:opacity-100"
            onPointerDown={(event) => {
              event.preventDefault()
              mediaPreviewResizeStateRef.current = {
                pointerId: event.pointerId,
                startX: event.clientX,
                startY: event.clientY,
                startWidth: resolvedMediaPreviewSize.width,
                startHeight: resolvedMediaPreviewSize.height,
              }
            }}
          >
            <span className="absolute left-[6px] top-[6px] h-[7px] w-px rounded-full bg-current opacity-85" />
            <span className="absolute left-[6px] top-[6px] h-px w-[7px] rounded-full bg-current opacity-85" />
          </button>
        ) : null}
        <div className="flex items-center gap-2 border-b border-[color:var(--app-border)] px-3 py-2">
          <div className="relative min-w-0 flex-1">
            {isMediaPreviewTitleVisible && !compactMediaPreview ? (
              <div className="absolute left-0 top-full z-10 mt-2 max-w-[min(30rem,calc(100vw-2rem))] rounded-[12px] border border-[color:var(--app-border)] bg-[color:var(--app-panel)] px-3 py-2 text-xs text-[color:var(--app-text)] shadow-[0_14px_30px_rgba(8,15,28,0.28)] break-all">
                {displayFileName}
              </div>
            ) : null}
            <button
              type="button"
              className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-bold text-[color:var(--app-text)]"
              aria-label={displayFileName}
              title={compactMediaPreview ? displayFileName : undefined}
              onPointerEnter={() => !compactMediaPreview && setTitleVisibleForPath(mediaPreview.path)}
              onPointerLeave={() => !compactMediaPreview && setTitleVisibleForPath(null)}
              onFocus={() => !compactMediaPreview && setTitleVisibleForPath(mediaPreview.path)}
              onBlur={() => !compactMediaPreview && setTitleVisibleForPath(null)}
              onClick={() => {
                if (!compactMediaPreview) {
                  setTitleVisibleForPath((current) => (current === mediaPreview.path ? null : mediaPreview.path))
                }
              }}
            >
              {displayFileName}
            </button>
          </div>
          <UIButton
            size="icon-xs"
            variant="ghost"
            aria-label={messages.explorer.minimizePreview()}
            title={messages.explorer.minimizePreview()}
            onClick={() => {
              setTitleVisibleForPath(null)
              setMediaPreviewMinimized(true)
            }}
          >
            <IconMinus size={14} stroke={1.8} />
          </UIButton>
          <UIButton
            size="icon-xs"
            variant="ghost"
            aria-label={messages.explorer.download()}
            title={messages.explorer.download()}
            onClick={() => {
              const anchor = document.createElement("a")
              anchor.href = mediaPreview.url
               anchor.download = displayFileName
              anchor.rel = "noreferrer"
              document.body.appendChild(anchor)
              anchor.click()
              anchor.remove()
            }}
          >
            <IconDownload size={14} stroke={1.8} />
          </UIButton>
          <UIButton
            size="icon-xs"
            variant="ghost"
            aria-label={messages.common.close()}
            title={messages.common.close()}
            onClick={() => {
              setTitleVisibleForPath(null)
              setMediaPreview(null)
            }}
          >
            <IconX size={14} stroke={1.8} />
          </UIButton>
        </div>
        <div
          className={cn(
            "min-h-0 overflow-hidden",
            compactMediaPreview ? "min-h-0 flex-1" : "min-h-0 flex-1",
            mediaPreview.kind === "video"
              ? "bg-black"
              : "flex items-center justify-center bg-[color:var(--app-panel-strong)] p-2",
          )}
          style={
            compactMediaPreview
              ? undefined
              : {
                  height: mediaPreviewBodyHeight,
                }
          }
        >
          {mediaPreview.kind === "image" ? (
            <img
              src={mediaPreview.url}
               alt={displayFileName}
              className="max-h-full max-w-full object-contain"
              onLoad={(event) => {
                updateMediaPreviewLayout(
                  "image",
                  event.currentTarget.naturalWidth,
                  event.currentTarget.naturalHeight,
                )
              }}
            />
          ) : null}
          {mediaPreview.kind === "audio" ? (
            <audio src={mediaPreview.url} controls className="w-full min-w-0" />
          ) : null}
          {mediaPreview.kind === "video" ? (
            <div className="flex h-full w-full items-center justify-center bg-black">
              <video
                src={mediaPreview.url}
                controls
                className="block h-full w-full object-contain bg-black"
                onLoadedMetadata={(event) => {
                  updateMediaPreviewLayout(
                    "video",
                    event.currentTarget.videoWidth,
                    event.currentTarget.videoHeight,
                  )
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export { MediaPreviewOverlay }
