import { IconArrowUp, IconChevronDown, IconColumns, IconCopy, IconDotsVertical, IconFile, IconFolderFilled, IconHome, IconPencil, IconPlus, IconRefresh, IconX } from "@tabler/icons-react"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useExplorerCopyDirMutation } from "@/features/explorer/api/use-explorer-copy-dir-mutation"
import { useRemotesQuery } from "@/features/remotes/api/use-remotes-query"
import { useExplorerCopyFileMutation } from "@/features/explorer/api/use-explorer-copy-file-mutation"
import { useExplorerDeleteDirMutation } from "@/features/explorer/api/use-explorer-delete-dir-mutation"
import { useExplorerDeleteFileMutation } from "@/features/explorer/api/use-explorer-delete-file-mutation"
import { PageShell } from "@/shared/components/page-shell"
import { MutationFeedbacks } from "@/shared/components/mutation-feedbacks"
import { useExplorerFsInfoQuery } from "@/features/explorer/api/use-explorer-fs-info-query"
import { useExplorerListQuery } from "@/features/explorer/api/use-explorer-list-query"
import { useExplorerMkdirMutation } from "@/features/explorer/api/use-explorer-mkdir-mutation"
import { useExplorerMoveDirMutation } from "@/features/explorer/api/use-explorer-move-dir-mutation"
import { useExplorerMoveFileMutation } from "@/features/explorer/api/use-explorer-move-file-mutation"
import { useExplorerPublicLinkMutation } from "@/features/explorer/api/use-explorer-public-link-mutation"
import { useRcServeAvailabilityQuery } from "@/features/explorer/api/use-rc-serve-availability-query"
import { useExplorerSizeQuery } from "@/features/explorer/api/use-explorer-size-query"
import { useExplorerUsageQuery } from "@/features/explorer/api/use-explorer-usage-query"
import { useExplorerBatchMutation } from "@/features/explorer/api/use-explorer-batch-mutation"
import {
  filterAndSortExplorerItems,
  formatBytes,
  formatModTime,
  nextSortMode,
  sortLabel,
} from "@/features/explorer/lib/display-utils"
import { buildRcServeUrl } from "@/features/explorer/lib/rc-serve-url"
import { joinPath, normalizePath, parentPath } from "@/features/explorer/lib/path-utils"
import { useExplorerStore } from "@/features/explorer/store/explorer-store"
import { useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
import { useConfirm } from "@/shared/components/confirm-provider"
import { EmptyState } from "@/shared/components/empty-state"
import { LoadingState } from "@/shared/components/loading-state"
import { useNotify } from "@/shared/components/notification-provider"
import { QueryErrorAlert } from "@/shared/components/query-error-alert"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Card as UICard, CardContent as UICardContent } from "@/shared/components/ui/card"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Input } from "@/shared/components/ui/input"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet"
import { Table, TableHead, TableHeadRow, TableShell } from "@/shared/components/ui/table"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { useI18n } from "@/shared/i18n"
import { inputExamples, resolveInputExample } from "@/shared/i18n/input-examples"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { cn } from "@/shared/lib/cn"
import { useConnectionStore } from "@/shared/store/connection-store"
import { usePageChromeStore } from "@/shared/store/page-chrome-store"
import { startManagedUpload } from "@/features/uploads/lib/upload-manager"
import { useUploadCenterStore } from "@/features/uploads/store/upload-center-store"
import {
  useExplorerUIStore,
  type MediaPreviewLayout,
  type MediaPreviewState,
  type PendingTransferAction,
  type PendingTransferItem,
} from "@/features/explorer/store/explorer-ui-store"

type PublicLinkState = {
  fileName: string
  url: string
} | null

type ExplorerRowUiState = {
  tabId: string
  path: string
} | null

const EMPTY_SELECTED_PATHS: string[] = []

const IMAGE_EXTENSIONS = new Set(["avif", "bmp", "gif", "jpeg", "jpg", "png", "svg", "webp"])
const AUDIO_EXTENSIONS = new Set(["aac", "flac", "m4a", "mp3", "oga", "ogg", "wav", "weba"])
const VIDEO_EXTENSIONS = new Set(["m4v", "mov", "mp4", "ogv", "webm"])
function getFileExtension(name: string) {
  const extension = name.split(".").pop()
  return extension ? extension.toLowerCase() : ""
}

function getPreviewKind(item: PendingTransferItem): NonNullable<MediaPreviewState>["kind"] | null {
  const mimeType = item.mimeType?.toLowerCase()
  if (mimeType?.startsWith("image/")) {
    return "image"
  }
  if (mimeType?.startsWith("audio/")) {
    return "audio"
  }
  if (mimeType?.startsWith("video/")) {
    return "video"
  }

  const extension = getFileExtension(item.itemName)
  if (IMAGE_EXTENSIONS.has(extension)) {
    return "image"
  }
  if (AUDIO_EXTENSIONS.has(extension)) {
    return "audio"
  }
  if (VIDEO_EXTENSIONS.has(extension)) {
    return "video"
  }

  return null
}

function getDefaultMediaPreviewLayout(kind: NonNullable<MediaPreviewState>["kind"]): MediaPreviewLayout {
  if (kind === "audio") {
    return "audio"
  }

  return kind === "image" ? "image-landscape" : "video-landscape"
}

function ExplorerPage() {
  const { locale, messages } = useI18n()
  const tabs = useExplorerStore((state) => state.tabs)
  const activeTabId = useExplorerStore((state) => state.activeTabId)
  const currentRemote = useExplorerStore((state) => state.currentRemote)
  const currentPath = useExplorerStore((state) => state.currentPath)
  const setScope = useExplorerStore((state) => state.setScope)
  const setUIScope = useExplorerUIStore((state) => state.setScope)
  const addTab = useExplorerStore((state) => state.addTab)
  const closeTab = useExplorerStore((state) => state.closeTab)
  const activateTab = useExplorerStore((state) => state.activateTab)
  const setCurrentRemote = useExplorerStore((state) => state.setCurrentRemote)
  const setCurrentPath = useExplorerStore((state) => state.setCurrentPath)
  const setSortMode = useExplorerStore((state) => state.setSortMode)
  const [newDirectoryName, setNewDirectoryName] = useState("")
  const pendingTransferAction = useExplorerUIStore((state) =>
    state.scopeKey ? state.actionsByScope[state.scopeKey]?.pendingTransferAction : null,
  )
  const setPendingTransferAction = useExplorerUIStore((state) => state.setPendingTransferAction)
  const pendingRenameAction = useExplorerUIStore((state) =>
    state.scopeKey ? state.actionsByScope[state.scopeKey]?.pendingRenameAction : null,
  )
  const setPendingRenameAction = useExplorerUIStore((state) => state.setPendingRenameAction)
  const authMode = useConnectionStore((state) => state.authMode)
  const apiBaseUrl = useConnectionStore((state) => state.lastServerInfo?.apiBaseUrl ?? state.baseUrl)
  const [publicLink, setPublicLink] = useState<PublicLinkState>(null)
  const [filterText, setFilterText] = useState("")
  const [locationDraft, setLocationDraft] = useState("")
  const [isPathEditing, setIsPathEditing] = useState(false)
  const [isRefreshingLocation, setIsRefreshingLocation] = useState(false)
  const [showNewDirectoryInput, setShowNewDirectoryInput] = useState(false)
  const [showFilterInput, setShowFilterInput] = useState(false)
  const [hoveredTabId, setHoveredTabId] = useState<string | null>(null)
  const [mobileSessionsOpened, setMobileSessionsOpened] = useState(false)
  const [activeItemState, setActiveItemState] = useState<ExplorerRowUiState>(null)
  const [openRowActionState, setOpenRowActionState] = useState<ExplorerRowUiState>(null)
  const uploadInputRef = useRef<HTMLInputElement | null>(null)
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const pendingFocusPathRef = useRef<string | null>(null)
  const pendingFocusFrameRef = useRef<number | null>(null)
  const setInspectDirectoryPaths = useExplorerUIStore((state) => state.setInspectDirectoryPaths)
  const setSelectionModes = useExplorerUIStore((state) => state.setSelectionModes)
  const setSelectedPathsByTab = useExplorerUIStore((state) => state.setSelectedPathsByTab)
  const setMediaPreview = useExplorerUIStore((state) => state.setMediaPreview)
  const setUploadCenterCollapsed = useUploadCenterStore((state) => state.setCollapsed)
  const profiles = useSavedConnectionsStore((state) => state.profiles)
  const selectedProfileId = useSavedConnectionsStore((state) => state.selectedProfileId)
  const sortMode = useMemo(
    () => tabs.find((tab) => tab.id === activeTabId)?.sortMode ?? "name-asc",
    [activeTabId, tabs],
  )
  const inspectDirectoryPath = useExplorerUIStore((state) => state.inspectDirectoryPaths[activeTabId] ?? "")
  const selectionMode = useExplorerUIStore((state) => state.selectionModes[activeTabId] ?? false)
  const selectedPaths = useExplorerUIStore((state) => state.selectedPathsByTab[activeTabId] ?? EMPTY_SELECTED_PATHS)
  const remotesQuery = useRemotesQuery()
  const explorerQuery = useExplorerListQuery(currentRemote, currentPath)
  const fsInfoQuery = useExplorerFsInfoQuery(currentRemote)
  const supportsAbout = Boolean(fsInfoQuery.data?.features?.About)
  const usageQuery = useExplorerUsageQuery(currentRemote, supportsAbout)
  const rcServeAvailabilityQuery = useRcServeAvailabilityQuery()
  const inspectDirectorySizeQuery = useExplorerSizeQuery(
    currentRemote,
    inspectDirectoryPath,
    Boolean(inspectDirectoryPath),
  )
  const mkdirMutation = useExplorerMkdirMutation()
  const deleteFileMutation = useExplorerDeleteFileMutation()
  const batchMutation = useExplorerBatchMutation()
  const deleteDirMutation = useExplorerDeleteDirMutation()
  const copyDirMutation = useExplorerCopyDirMutation()
  const copyFileMutation = useExplorerCopyFileMutation()
  const moveDirMutation = useExplorerMoveDirMutation()
  const moveFileMutation = useExplorerMoveFileMutation()
  const publicLinkMutation = useExplorerPublicLinkMutation()
  const confirm = useConfirm()
  const notify = useNotify()
  const setHeaderContent = usePageChromeStore((state) => state.setHeaderContent)
  const connectionScope = useConnectionScope()
  const compactHeader = useMediaQuery("(max-width: 48em)")
  const compactToolbar = useMediaQuery("(max-width: 64em)")
  const [showMetaColsWide, setShowMetaColsWide] = useState(true)
  const [showMetaColsNarrow, setShowMetaColsNarrow] = useState(false)
  const showMetaCols = compactHeader ? showMetaColsNarrow : showMetaColsWide
  const setShowMetaCols = compactHeader ? setShowMetaColsNarrow : setShowMetaColsWide
  const supportsPublicLink = Boolean(fsInfoQuery.data?.features?.PublicLink)
  const remoteOptions = useMemo(
    () => (remotesQuery.data ?? []).map((remote) => ({ value: remote.name, label: remote.name })),
    [remotesQuery.data],
  )
  const tabLabels = useMemo(
    () =>
      tabs.map((tab) => {
        const normalizedPath = normalizePath(tab.path)
        const pathLabel = normalizedPath ? normalizedPath.split("/").at(-1) : ""
        const remoteLabel = tab.remote || messages.explorer.newTab()

        return {
          id: tab.id,
          title: pathLabel ? `${remoteLabel}:${pathLabel}` : remoteLabel,
        }
      }),
    [messages.explorer, tabs],
  )
  const activeTabLabel = useMemo(
    () => tabLabels.find((tab) => tab.id === activeTabId)?.title ?? messages.explorer.currentSession(),
    [activeTabId, messages.explorer, tabLabels],
  )
  const clearPendingFileAction = () => {
    setPendingTransferAction(null)
    setPendingRenameAction(null)
  }
  const isRcServeAvailabilityPending =
    authMode === "none" &&
    rcServeAvailabilityQuery.data === undefined &&
    (rcServeAvailabilityQuery.isPending || rcServeAvailabilityQuery.isLoading)
  const rcServeAvailable = authMode === "none" && rcServeAvailabilityQuery.data === true
  const downloadFromRcServe = useCallback((item: PendingTransferItem) => {
    if (!rcServeAvailable || !currentRemote) {
      return
    }

    const anchor = document.createElement("a")
    anchor.href = buildRcServeUrl(apiBaseUrl, currentRemote, item.srcPath)
    anchor.download = item.itemName
    anchor.rel = "noreferrer"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }, [apiBaseUrl, currentRemote, rcServeAvailable])
  const downloadManyFromRcServe = useCallback((items: PendingTransferItem[]) => {
    for (const item of items) {
      downloadFromRcServe(item)
    }
  }, [downloadFromRcServe])
  const openMediaPreview = useCallback((item: PendingTransferItem) => {
    if (!rcServeAvailable || !currentRemote) {
      return
    }

    const kind = getPreviewKind(item)
    if (!kind) {
      return
    }

    setUploadCenterCollapsed(true)
    setMediaPreview({
      fileName: item.itemName,
      kind,
      layout: getDefaultMediaPreviewLayout(kind),
      path: item.srcPath,
      url: buildRcServeUrl(apiBaseUrl, currentRemote, item.srcPath),
    })
  }, [apiBaseUrl, currentRemote, rcServeAvailable, setMediaPreview, setUploadCenterCollapsed])
  const setSelectionMode = useCallback((enabled: boolean) => {
    setSelectionModes((state) => ({
      ...state,
      [activeTabId]: enabled,
    }))

    if (!enabled) {
      setSelectedPathsByTab((state) => ({
        ...state,
        [activeTabId]: [],
      }))
    }
  }, [activeTabId, setSelectedPathsByTab, setSelectionModes])
  const openNewDirectoryInput = useCallback((enabled: boolean) => {
    setShowNewDirectoryInput(enabled)

    if (enabled) {
      setShowFilterInput(false)
      setSelectionMode(false)
    }
  }, [setSelectionMode])
  const openFilterInput = useCallback((enabled: boolean) => {
    setShowFilterInput(enabled)
    if (enabled) {
      setShowNewDirectoryInput(false)
    }
  }, [])
  const toggleSelectionMode = (enabled: boolean) => {
    setSelectionMode(enabled)

    if (enabled) {
      setShowNewDirectoryInput(false)
    }
  }
  const clearSelection = useCallback(() => {
    setSelectedPathsByTab((state) => ({
      ...state,
      [activeTabId]: [],
    }))
  }, [activeTabId, setSelectedPathsByTab])
  const toggleSelectedPath = (path: string) => {
    setSelectedPathsByTab((state) => {
      const current = state[activeTabId] ?? []
      const next = current.includes(path)
        ? current.filter((item) => item !== path)
        : [...current, path]

      return {
        ...state,
        [activeTabId]: next,
      }
    })
  }
  const setInspectDirectoryPath = (path: string) => {
    setInspectDirectoryPaths((state) => ({
      ...state,
      [activeTabId]: path,
    }))
  }
  const clearInspectDirectoryPath = useCallback(() => {
    setInspectDirectoryPaths((state) => {
      const nextState = { ...state }
      delete nextState[activeTabId]
      return nextState
    })
  }, [activeTabId, setInspectDirectoryPaths])
  const resolveTargetPath = (
    item: PendingTransferItem,
    destinationPath: string,
    mode: NonNullable<PendingTransferAction>["mode"] = "copy",
  ) => {
    if (item.itemType === "file") {
      return joinPath(destinationPath.trim(), item.itemName)
    }

    if (mode === "sync") {
      return normalizePath(destinationPath.trim())
    }

    return normalizePath(joinPath(destinationPath.trim(), item.itemName))
  }
  const getPendingTransferSourceLabel = (action: NonNullable<PendingTransferAction>) => {
    if (action.items.length !== 1) {
      return `${action.items.length} items from ${action.sourceRemote}:${normalizePath(action.sourcePath) || "/"}`
    }

    const [item] = action.items
    return `${action.sourceRemote}:${normalizePath(item.srcPath) || "/"}`
  }
  const getPendingTransferDestinationLabel = (
    action: NonNullable<PendingTransferAction>,
    remote: string,
    destinationPath: string,
  ) => {
    if (action.items.length !== 1) {
      return formatRemoteLocation(remote, destinationPath)
    }

    const [item] = action.items
    return formatRemoteLocation(remote, resolveTargetPath(item, destinationPath, action.mode))
  }
  const formatRemoteLocation = (remote: string, path: string) => {
    const normalizedPath = normalizePath(path)
    return remote ? `${remote}:${normalizedPath ? normalizedPath : ""}` : normalizedPath || ""
  }
  const pathNodes = useMemo(() => {
    const normalizedPath = normalizePath(currentPath)

    if (!normalizedPath) {
      return null
    }

    const segments = normalizedPath.split("/")
    return segments.flatMap((segment, index) => {
      const nextPath = segments.slice(0, index + 1).join("/")
      const isCurrent = index === segments.length - 1
      // Each segment shrinks proportionally; min-width keeps a few chars visible.
      // text-overflow ellipsis only fires when the container is actually too small.
      const segmentNode = isCurrent ? (
        <span
          key={nextPath}
          title={segment}
          className="min-w-[2ch] shrink overflow-hidden text-ellipsis whitespace-nowrap text-[13px] font-normal text-[color:var(--app-text)]"
        >
          {segment}
        </span>
      ) : (
        <button
          key={nextPath}
          type="button"
          title={segment}
          className="min-w-[2ch] [flex-shrink:9999] overflow-hidden text-ellipsis whitespace-nowrap text-sm text-[color:var(--app-accent-strong)] transition-colors hover:text-[color:var(--app-accent)]"
          onClick={() => setCurrentPath(nextPath)}
        >
          {segment}
        </button>
      )

      if (index === 0) {
        return [segmentNode]
      }

      return [
        <span key={`sep-${nextPath}`} className="shrink-0 text-sm text-[color:var(--app-text-soft)]">
          /
        </span>,
        segmentNode,
      ]
    })
  }, [currentPath, setCurrentPath])

  const visibleItems = useMemo(() => {
    return filterAndSortExplorerItems(explorerQuery.data?.items ?? [], filterText, sortMode)
  }, [explorerQuery.data?.items, filterText, sortMode])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [bodyScrollbarWidth, setBodyScrollbarWidth] = useState(0)
  const activeItemPath = activeItemState?.tabId === activeTabId ? activeItemState.path : null
  const openRowActionPath = openRowActionState?.tabId === activeTabId ? openRowActionState.path : null
  const visibleItemPaths = useMemo(
    () => visibleItems.map((item) => joinPath(currentPath, item.name)),
    [currentPath, visibleItems],
  )
  const activeItemIndex = useMemo(
    () => (activeItemPath ? visibleItemPaths.indexOf(activeItemPath) : -1),
    [activeItemPath, visibleItemPaths],
  )
  const scrollResetKey = `${activeTabId}::${currentRemote}::${currentPath}::${sortMode}::${filterText}`
  const previousScrollResetKeyRef = useRef<string | null>(null)
  const virtualizer = useVirtualizer({
    count: visibleItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 40,
    overscan: 8,
  })
  // Keep scroll position during data refreshes like delete, but reset for navigation/sort/filter changes.
  useEffect(() => {
    const previousKey = previousScrollResetKeyRef.current
    previousScrollResetKeyRef.current = scrollResetKey

    if (previousKey === null || previousKey === scrollResetKey) {
      return
    }

    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0
    }
  }, [scrollResetKey])
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const updateScrollbarWidth = () => {
      setBodyScrollbarWidth(Math.max(container.offsetWidth - container.clientWidth, 0))
    }

    updateScrollbarWidth()

    if (typeof ResizeObserver === "undefined") {
      return
    }

    const resizeObserver = new ResizeObserver(() => {
      updateScrollbarWidth()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
    }
  }, [visibleItems.length, showMetaCols])
  const selectedItems = useMemo(() => {
    const selectedSet = new Set(selectedPaths)
    return (explorerQuery.data?.items ?? [])
      .filter((item) => selectedSet.has(joinPath(currentPath, item.name)))
      .map((item) => ({
        itemType: item.type,
        itemName: item.name,
        srcPath: joinPath(currentPath, item.name),
        mimeType: item.mimeType,
        size: item.size,
      }))
  }, [currentPath, explorerQuery.data?.items, selectedPaths])
  const syncEnabled = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId)?.syncEnabled ?? false,
    [profiles, selectedProfileId],
  )
  const uploadEnabled = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId)?.uploadEnabled ?? false,
    [profiles, selectedProfileId],
  )
  const selectedPathSet = useMemo(() => new Set(selectedPaths), [selectedPaths])
  const allVisibleSelected =
    visibleItems.length > 0 &&
    visibleItems.every((item) => selectedPathSet.has(joinPath(currentPath, item.name)))
  const someVisibleSelected = visibleItems.some((item) => selectedPathSet.has(joinPath(currentPath, item.name)))
  const canSyncSelection =
    syncEnabled && selectedItems.length === 1 && selectedItems.every((item) => item.itemType === "dir")
  const canShareSelection = selectedItems.length === 1 && supportsPublicLink
  const canDownloadSelection =
    selectedItems.length > 0 && selectedItems.every((item) => item.itemType === "file") && rcServeAvailable
  const canBulkDownloadSelection = !compactToolbar && canDownloadSelection
  const shouldShowSelectionDownloadCheck =
    !compactToolbar &&
    selectedItems.length > 0 &&
    selectedItems.every((item) => item.itemType === "file") &&
    isRcServeAvailabilityPending
  const copyLocationValue =
    selectedItems.length === 1
      ? formatRemoteLocation(currentRemote, selectedItems[0].srcPath)
      : formatRemoteLocation(currentRemote, currentPath)
  const fullPathLabel = currentRemote
    ? formatRemoteLocation(currentRemote, currentPath)
    : normalizePath(currentPath) || "/"
  const destinationLabel = currentRemote ? formatRemoteLocation(currentRemote, currentPath) : "-"
  const pendingTransferLoading =
    copyDirMutation.isPending ||
    moveDirMutation.isPending ||
    copyFileMutation.isPending ||
    moveFileMutation.isPending ||
    batchMutation.isPending
  const usageSummaryLabel =
    usageQuery.data?.total !== undefined
      ? `${formatBytes(usageQuery.data.used, locale)} / ${formatBytes(usageQuery.data.total, locale)}`
      : null
  useEffect(() => {
    setScope(connectionScope)
    setUIScope(connectionScope)
  }, [connectionScope, setScope, setUIScope])

  useEffect(() => {
    setLocationDraft(fullPathLabel)
  }, [fullPathLabel])

  useEffect(() => {
    setPublicLink(null)
  }, [currentPath, currentRemote, supportsPublicLink])

  useEffect(() => {
    if (currentRemote && authMode === "none" && rcServeAvailabilityQuery.data === false) {
      setMediaPreview(null)
    }
  }, [authMode, currentRemote, rcServeAvailabilityQuery.data, setMediaPreview])

  useEffect(() => {
    setFilterText("")
    setShowFilterInput(false)
    setShowNewDirectoryInput(false)
    setActiveItemState(null)
    setOpenRowActionState(null)
  }, [activeTabId])

  useEffect(() => {
    if (visibleItemPaths.length === 0) {
      setActiveItemState(null)
      return
    }

    if (activeItemPath && !visibleItemPaths.includes(activeItemPath)) {
      setActiveItemState(
        visibleItemPaths[0]
          ? {
              tabId: activeTabId,
              path: visibleItemPaths[0],
            }
          : null,
      )
    }
  }, [activeItemPath, activeTabId, visibleItemPaths])

  useEffect(() => {
    if (!pendingFocusPathRef.current) {
      return
    }

    const targetPath = pendingFocusPathRef.current
    const row = rowRefs.current[targetPath]
    if (row) {
      row.focus()
      pendingFocusPathRef.current = null
      if (pendingFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFocusFrameRef.current)
        pendingFocusFrameRef.current = null
      }
      return
    }

    let attemptsRemaining = 8
    const tryFocus = () => {
      const pendingPath = pendingFocusPathRef.current
      if (!pendingPath) {
        pendingFocusFrameRef.current = null
        return
      }

      const pendingRow = rowRefs.current[pendingPath]
      if (pendingRow) {
        pendingRow.focus()
        pendingFocusPathRef.current = null
        pendingFocusFrameRef.current = null
        return
      }

      if (attemptsRemaining <= 0) {
        pendingFocusFrameRef.current = null
        return
      }

      attemptsRemaining -= 1
      pendingFocusFrameRef.current = window.requestAnimationFrame(tryFocus)
    }

    pendingFocusFrameRef.current = window.requestAnimationFrame(tryFocus)
    return () => {
      if (pendingFocusFrameRef.current !== null) {
        window.cancelAnimationFrame(pendingFocusFrameRef.current)
        pendingFocusFrameRef.current = null
      }
    }
  }, [activeItemPath, visibleItems])

  const didMountRef = useRef(false)
  const prevTabIdRef = useRef(activeTabId)
  useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true
      prevTabIdRef.current = activeTabId
      return
    }

    if (activeTabId !== prevTabIdRef.current) {
      prevTabIdRef.current = activeTabId
      return
    }

    clearSelection()
  }, [activeTabId, clearSelection, currentPath, currentRemote])

  const beginTransfer = (mode: "copy" | "move" | "sync") => {
    if (selectedItems.length === 0) {
      return
    }

    setPublicLink(null)
    setPendingTransferAction({
      mode,
      sourceRemote: currentRemote,
      sourcePath: currentPath,
      items: selectedItems,
    })
  }
  const beginRename = () => {
    if (selectedItems.length !== 1) {
      return
    }

    const item = selectedItems[0]
    setPublicLink(null)
    setPendingTransferAction(null)
    setPendingRenameAction({
      item,
      nextName: item.itemName,
    })
  }
  const beginSingleTransfer = (mode: "copy" | "move" | "sync", item: PendingTransferItem) => {
    setPublicLink(null)
    setPendingRenameAction(null)
    setPendingTransferAction({
      mode,
      sourceRemote: currentRemote,
      sourcePath: currentPath,
      items: [item],
    })
    setSelectionMode(false)
    clearSelection()
  }
  const beginSingleRename = (item: PendingTransferItem) => {
    setPublicLink(null)
    setPendingTransferAction(null)
    setPendingRenameAction({
      item,
      nextName: item.itemName,
    })
    setSelectionMode(false)
    clearSelection()
  }
  const handleSingleDelete = useCallback(async (item: PendingTransferItem) => {
    const confirmed = await confirm({
      title: messages.explorer.deleteItem(),
      message: messages.explorer.deleteItemMessage(item.srcPath),
      confirmLabel: messages.common.delete(),
    })

    if (!confirmed) {
      return
    }

    if (item.itemType === "dir") {
      await deleteDirMutation.mutateAsync({
        remote: currentRemote,
        currentPath,
        targetPath: item.srcPath,
      })
      return
    }

    await deleteFileMutation.mutateAsync({
      remote: currentRemote,
      currentPath,
      targetPaths: [item.srcPath],
    })
  }, [
    confirm,
    currentPath,
    currentRemote,
    deleteDirMutation,
    deleteFileMutation,
    messages.common,
    messages.explorer,
  ])

  const handleDeleteSelection = useCallback(async () => {
    if (selectedItems.length === 0) {
      return
    }

    const confirmed = await confirm({
      title: selectedItems.length === 1 ? messages.explorer.deleteItem() : messages.explorer.deleteSelectedItems(),
      message:
        selectedItems.length === 1
          ? messages.explorer.deleteItemMessage(selectedItems[0]?.srcPath ?? "")
          : messages.explorer.deleteSelectedItemsMessage(selectedItems.length),
      confirmLabel: messages.common.delete(),
    })

    if (!confirmed) {
      return
    }

    const inputs = selectedItems.map((item) => ({
      _path: item.itemType === "dir" ? "operations/purge" : "operations/deletefile",
      fs: `${currentRemote}:`,
      remote: item.srcPath,
    }))

    await batchMutation.mutateAsync({
      remote: currentRemote,
      currentPath,
      inputs,
    })

    clearSelection()
    setSelectionMode(false)
  }, [
    batchMutation,
    clearSelection,
    confirm,
    currentPath,
    currentRemote,
    messages.common,
    messages.explorer,
    selectedItems,
    setSelectionMode,
  ])
  const focusItemAtIndex = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, visibleItemPaths.length - 1))
    const nextPath = visibleItemPaths[boundedIndex]

    if (!nextPath) {
      return
    }

    setActiveItemState({
      tabId: activeTabId,
      path: nextPath,
    })
    pendingFocusPathRef.current = nextPath
    virtualizer.scrollToIndex?.(boundedIndex, { align: "auto" })
    const row = rowRefs.current[nextPath]
    row?.scrollIntoView?.({ block: "nearest" })
    row?.focus()
  }, [activeTabId, virtualizer, visibleItemPaths])

  const closeTransientExplorerUi = useCallback(() => {
    let closed = false

    if (publicLink) {
      setPublicLink(null)
      closed = true
    }

    if (openRowActionPath) {
      setOpenRowActionState(null)
      closed = true
    }

    if (pendingRenameAction) {
      setPendingRenameAction(null)
      closed = true
    }

    if (pendingTransferAction) {
      setPendingTransferAction(null)
      closed = true
    }

    if (showNewDirectoryInput) {
      openNewDirectoryInput(false)
      setNewDirectoryName("")
      closed = true
    }

    if (showFilterInput) {
      setShowFilterInput(false)
      setFilterText("")
      closed = true
    }

    if (isPathEditing) {
      setLocationDraft(fullPathLabel)
      setIsPathEditing(false)
      closed = true
    }

    if (selectionMode) {
      clearSelection()
      setSelectionMode(false)
      closed = true
    }

    if (inspectDirectoryPath) {
      clearInspectDirectoryPath()
      closed = true
    }

    return closed
  }, [
    clearInspectDirectoryPath,
    clearSelection,
    fullPathLabel,
    inspectDirectoryPath,
    isPathEditing,
    openNewDirectoryInput,
    pendingRenameAction,
    pendingTransferAction,
    publicLink,
    selectionMode,
    openRowActionPath,
    setPendingRenameAction,
    setSelectionMode,
    setPendingTransferAction,
    setOpenRowActionState,
    showFilterInput,
    showNewDirectoryInput,
  ])

  const handleExplorerShortcut = useCallback(async (
    input: {
      key: string
      ctrlKey: boolean
      preventDefault: () => void
    },
    currentRowItem: PendingTransferItem,
  ) => {
    if (input.key === "ArrowDown") {
      input.preventDefault()
      if (activeItemIndex < 0) {
        focusItemAtIndex(0)
      } else {
        focusItemAtIndex(activeItemIndex + 1)
      }
      return
    }

    if (input.key === "ArrowUp") {
      input.preventDefault()
      if (activeItemIndex < 0) {
        focusItemAtIndex(0)
      } else {
        focusItemAtIndex(activeItemIndex - 1)
      }
      return
    }

    if (input.key === "Home") {
      input.preventDefault()
      focusItemAtIndex(0)
      return
    }

    if (input.key === "End") {
      input.preventDefault()
      focusItemAtIndex(visibleItemPaths.length - 1)
      return
    }

    if (input.key === "PageDown") {
      input.preventDefault()
      const pageSize = Math.max(Math.floor((scrollContainerRef.current?.clientHeight ?? 400) / 40), 1)
      if (activeItemIndex < 0) {
        focusItemAtIndex(pageSize)
      } else {
        focusItemAtIndex(activeItemIndex + pageSize)
      }
      return
    }

    if (input.key === "PageUp") {
      input.preventDefault()
      const pageSize = Math.max(Math.floor((scrollContainerRef.current?.clientHeight ?? 400) / 40), 1)
      if (activeItemIndex < 0) {
        focusItemAtIndex(0)
      } else {
        focusItemAtIndex(activeItemIndex - pageSize)
      }
      return
    }

    if (input.key === "Escape") {
      if (closeTransientExplorerUi()) {
        input.preventDefault()
      }
      return
    }

    if (input.key === "Backspace") {
      if (currentPath) {
        input.preventDefault()
        setCurrentPath(parentPath(currentPath))
      }
      return
    }

    if (input.key === "Enter" && input.ctrlKey) {
      if (!selectionMode) {
        input.preventDefault()
        setOpenRowActionState({
          tabId: activeTabId,
          path: currentRowItem.srcPath,
        })
      }
      return
    }

    if (input.key === "Enter") {
      if (currentRowItem.itemType === "dir") {
        input.preventDefault()
        setCurrentPath(currentRowItem.srcPath)
      }
      return
    }

    if (input.key === "Delete") {
      if (selectionMode && selectedItems.length > 0) {
        input.preventDefault()
        await handleDeleteSelection()
        return
      }

      input.preventDefault()
      await handleSingleDelete(currentRowItem)
    }
  }, [
    activeItemIndex,
    closeTransientExplorerUi,
    currentPath,
    focusItemAtIndex,
    handleDeleteSelection,
    handleSingleDelete,
    selectedItems.length,
    selectionMode,
    activeTabId,
    setCurrentPath,
    setOpenRowActionState,
    visibleItemPaths.length,
  ])
  const handleExplorerRowKeyDown = useCallback(async (
    event: ReactKeyboardEvent<HTMLDivElement>,
    currentRowItem: PendingTransferItem,
  ) => {
    const target = event.target
    if (!(target instanceof HTMLElement) || target !== event.currentTarget) {
      return
    }

    await handleExplorerShortcut({
      key: event.key,
      ctrlKey: event.ctrlKey,
      preventDefault: () => event.preventDefault(),
    }, currentRowItem)
  }, [handleExplorerShortcut])
  const handleTransientInputEscape = useCallback((event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape") {
      return
    }

    event.preventDefault()

    if (showNewDirectoryInput) {
      setNewDirectoryName("")
      openNewDirectoryInput(false)
    }

    if (showFilterInput) {
      setFilterText("")
      setShowFilterInput(false)
    }
  }, [openNewDirectoryInput, showFilterInput, showNewDirectoryInput])
  const activateExplorerTab = useCallback((tabId: string) => {
    pendingFocusPathRef.current = null
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest("[role='row']")) {
      document.activeElement.blur()
    }
    setActiveItemState(null)
    setOpenRowActionState(null)
    activateTab(tabId)
  }, [activateTab])

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName) ||
          target.closest("[role='dialog'], [role='menu'], [role='row']"))
      ) {
        return
      }

      const handlesExplorerNavigation =
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === "PageDown" ||
        event.key === "PageUp"

      if (handlesExplorerNavigation && visibleItems.length > 0) {
        const fallbackIndex = activeItemIndex >= 0 ? activeItemIndex : 0
        const fallbackItem = visibleItems[fallbackIndex]
        if (!fallbackItem) {
          return
        }

        void handleExplorerShortcut({
          key: event.key,
          ctrlKey: event.ctrlKey,
          preventDefault: () => event.preventDefault(),
        }, {
          itemType: fallbackItem.type,
          itemName: fallbackItem.name,
          srcPath: joinPath(currentPath, fallbackItem.name),
          mimeType: fallbackItem.mimeType,
          size: fallbackItem.size,
        })
        return
      }

      if (event.key === "Escape" && closeTransientExplorerUi()) {
        event.preventDefault()
      }
    }

    window.addEventListener("keydown", handleWindowKeyDown)
    return () => {
      window.removeEventListener("keydown", handleWindowKeyDown)
    }
  }, [activeItemIndex, closeTransientExplorerUi, currentPath, handleExplorerShortcut, visibleItems])

  const applyLocationDraft = () => {
    const draft = locationDraft.trim()

    if (!draft) {
      setCurrentPath("")
      setIsPathEditing(false)
      return
    }

    const separatorIndex = draft.indexOf(":")
    if (separatorIndex > -1) {
      const nextRemote = draft.slice(0, separatorIndex).trim()
      const nextPath = normalizePath(draft.slice(separatorIndex + 1).trim())

      setCurrentRemote(nextRemote)
      setCurrentPath(nextPath)
      setIsPathEditing(false)
      return
    }

    setCurrentPath(normalizePath(draft))
    setIsPathEditing(false)
  }

  const headerStorage = null

  const locationActionButtons = (
    <>
      {!isPathEditing ? (
        <UIButton
          variant="secondary"
          size="icon-sm"
          aria-label={messages.explorer.editPath()}
          title={messages.explorer.editPath()}
          onClick={() => setIsPathEditing(true)}
        >
          <IconPencil size={16} stroke={1.8} />
        </UIButton>
      ) : null}
      <UIButton
        variant="secondary"
        size="icon-sm"
        aria-label={messages.explorer.copyLocation()}
        title={messages.explorer.copyLocation()}
        onClick={async () => {
          await navigator.clipboard.writeText(copyLocationValue)
          notify({
            color: "green",
            title: messages.explorer.locationCopied(),
            message: copyLocationValue,
          })
        }}
      >
        <IconCopy size={16} stroke={1.8} />
      </UIButton>
      <UIButton
        disabled={!currentRemote || !currentPath}
        variant="secondary"
        size="icon-sm"
        aria-label={messages.explorer.goToRemoteRoot()}
        title={messages.explorer.goToRemoteRoot()}
        onClick={() => {
          setCurrentPath("")
        }}
      >
        <IconHome size={16} stroke={1.8} />
      </UIButton>
      <UIButton
        disabled={!currentPath}
        variant="secondary"
        size="icon-sm"
        aria-label={messages.explorer.upOneLevel()}
        title={messages.explorer.upOneLevel()}
        onClick={() => {
          setCurrentPath(parentPath(currentPath))
        }}
      >
        <IconArrowUp size={16} stroke={1.8} />
      </UIButton>
      <UIButton
        onClick={async () => {
          if (!currentRemote) {
            return
          }

          setIsRefreshingLocation(true)
          try {
            await Promise.all([
              explorerQuery.refetch(),
              authMode === "none" ? rcServeAvailabilityQuery.refetch() : Promise.resolve(),
            ])
          } finally {
            setIsRefreshingLocation(false)
          }
        }}
        disabled={!currentRemote}
        variant="secondary"
        size="icon-sm"
        aria-label={messages.explorer.refresh()}
        title={messages.explorer.refresh()}
      >
        {isRefreshingLocation ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <IconRefresh size={16} stroke={1.8} />
        )}
      </UIButton>
    </>
  )

  const handleUploadFileSelection = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.currentTarget.files ?? [])
    const inputElement = event.currentTarget
    if (nextFiles.length === 0 || !currentRemote) {
      return
    }

    void startManagedUpload({
      remote: currentRemote,
      path: currentPath,
      files: nextFiles,
    })

    inputElement.value = ""
  }, [currentPath, currentRemote])

  useEffect(() => {
    if (compactHeader) {
      setHeaderContent(null)
      return
    }

    setHeaderContent(headerStorage)
    return () => {
      setHeaderContent(null)
    }
  }, [compactHeader, headerStorage, setHeaderContent])

  return (
    <PageShell
      title={messages.explorer.title()}
      hideBadge
      hideHeader
      bareContent
      contentStyle={{ paddingTop: 4, height: "100%", minHeight: 0 }}
    >
      <div className="app-page-stack flex h-full min-h-0 flex-col">
        {compactHeader && headerStorage ? (
          <div style={{ width: compactHeader ? "100%" : 320, maxWidth: "100%" }}>{headerStorage}</div>
        ) : null}
        <Sheet open={mobileSessionsOpened} onOpenChange={setMobileSessionsOpened}>
          <SheetContent side="bottom" className="sm:hidden">
            <SheetHeader>
              <SheetTitle>{messages.explorer.sessions()}</SheetTitle>
              <SheetDescription>{messages.explorer.sessionsDescription()}</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-2">
            {tabLabels.map((tab) => {
              const active = tab.id === activeTabId

              return (
                <UICard
                  key={tab.id}
                  onClick={() => {
                    activateExplorerTab(tab.id)
                    setMobileSessionsOpened(false)
                  }}
                  className={
                    active
                      ? "cursor-pointer border-[color:var(--app-interactive-selected-border)] bg-[color:var(--app-interactive-selected-bg)]"
                      : "app-surface-elevated-soft cursor-pointer"
                  }
                >
                  <UICardContent className="p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div
                          className={cn(
                            "truncate text-sm text-[color:var(--app-text)]",
                            "font-bold",
                          )}
                        >
                          {tab.title}
                        </div>
                      </div>
                      {tabs.length > 1 ? (
                        <UIButton
                          aria-label={messages.explorer.closeSession()}
                          className="h-7 w-7 rounded-[8px] p-0 text-[color:var(--app-text-soft)]"
                          size="icon"
                          variant="ghost"
                          onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
                            event.stopPropagation()
                            closeTab(tab.id)
                          }}
                        >
                          ×
                        </UIButton>
                      ) : null}
                    </div>
                  </UICardContent>
                </UICard>
              )
            })}
              <div className="pt-2">
                <UIButton
                  variant="secondary"
                  className="w-full"
                  onClick={() => {
                    addTab({ remote: currentRemote, path: currentPath })
                    setMobileSessionsOpened(false)
                  }}
                >
                  {messages.explorer.newSession()}
                </UIButton>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <UICard className="app-workspace-card app-workspace-card--quiet">
          <UICardContent className="px-3 py-3">
            <div className="flex flex-col gap-2.5">
              {compactHeader ? (
                <div className="flex items-center gap-1.5">
                  <UIButton
                    variant="secondary"
                    onClick={() => setMobileSessionsOpened(true)}
                    className="min-w-0 flex-1 justify-between"
                  >
                    <span className="truncate">{activeTabLabel}</span>
                    <IconChevronDown size={14} stroke={1.8} />
                  </UIButton>
                  {usageSummaryLabel ? (
                    <span className="shrink-0 whitespace-nowrap text-[13px] font-bold text-[color:var(--app-text-soft)]">
                      {usageSummaryLabel}
                    </span>
                  ) : null}
                </div>
              ) : null}
              {!compactHeader ? (
                <div className="flex gap-1.5 overflow-x-auto pb-0.5">
                  {tabLabels.map((tab) => {
                    const active = tab.id === activeTabId

                    return (
                        <div
                          key={tab.id}
                          onMouseEnter={() => setHoveredTabId(tab.id)}
                        onMouseLeave={() => setHoveredTabId((current) => (current === tab.id ? null : current))}
                        onClick={() => activateExplorerTab(tab.id)}
                        className={cn(
                          "flex h-8 w-max max-w-[20%] cursor-pointer items-center justify-between gap-2 rounded-[10px] border px-3 transition-colors",
                          active
                            ? "border-[color:var(--app-interactive-selected-border)] bg-[color:var(--app-interactive-selected-bg)] text-[color:var(--app-interactive-selected-text)]"
                            : "border-transparent bg-transparent hover:border-[color:var(--app-border)] hover:bg-[color:var(--app-hover-surface-strong)]",
                        )}
                      >
                        <span className={cn("truncate text-[13px] font-bold")}>
                          {tab.title}
                        </span>
                        {active || hoveredTabId === tab.id ? (
                          <button
                            type="button"
                            className="inline-flex h-5 w-5 items-center justify-center rounded-[7px] text-[color:var(--app-text-soft)] transition-colors hover:bg-[color:var(--app-hover-surface)] hover:text-[color:var(--app-text)]"
                            aria-label={messages.explorer.closeTab()}
                            onClick={(event) => {
                              event.stopPropagation()
                              closeTab(tab.id)
                            }}
                          >
                            <IconX size={13} stroke={2} />
                          </button>
                        ) : null}
                      </div>
                    )
                  })}
                  <UIButton
                    variant="secondary"
                    size="icon-sm"
                    aria-label={messages.explorer.newTab()}
                    onClick={() => addTab({ remote: currentRemote, path: currentPath })}
                    className="shrink-0"
                  >
                    <IconPlus size={13} stroke={2} />
                  </UIButton>
                  {usageSummaryLabel ? (
                    <div className="shrink-0 self-center whitespace-nowrap px-1 text-[13px] font-bold text-[color:var(--app-text-soft)]">
                      {usageSummaryLabel}
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div className={cn("gap-1.5", compactToolbar ? "flex flex-col" : "flex items-center")}>
                <div style={{ flex: 1, minWidth: 0 }} className={cn(compactToolbar ? "w-full" : "")}>
                  <div className="app-toolbar-card px-1.5 py-1">
                    {isPathEditing ? (
                      <Input
                        value={locationDraft}
                        placeholder={resolveInputExample(inputExamples.remotePath, locale)}
                        autoFocus
                        onChange={(event) => setLocationDraft(event.currentTarget.value)}
                        onBlur={applyLocationDraft}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            applyLocationDraft()
                          }
                          if (event.key === "Escape") {
                            setLocationDraft(fullPathLabel)
                            setIsPathEditing(false)
                          }
                        }}
                      />
                    ) : (
                      <div
                        title={fullPathLabel}
                        className="flex h-8 w-full items-center gap-1.5 overflow-hidden rounded-[10px] px-2"
                      >
                        {remoteOptions.length > 0 ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="inline-flex shrink-0 items-center gap-1 text-[13px] font-bold text-[color:var(--app-accent-strong)] transition-colors hover:text-[color:var(--app-accent)]"
                                title={messages.explorer.chooseRemote()}
                              >
                                <span>{currentRemote ? `${currentRemote}:` : messages.explorer.chooseRemote()}</span>
                                <IconChevronDown size={14} stroke={1.8} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[220px]">
                              {remoteOptions.map((option) => (
                                <DropdownMenuItem
                                  key={option.value}
                                  onClick={() => {
                                    setCurrentRemote(option.value)
                                    setCurrentPath("")
                                  }}
                                >
                                  {option.label}
                                </DropdownMenuItem>
                              ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <span className="shrink-0 text-[13px] font-bold text-[color:var(--app-text-soft)]">{messages.explorer.noRemotes()}</span>
                        )}
                        {pathNodes ? (
                          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-hidden">
                            {pathNodes}
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                  {!compactToolbar ? (
                    <div className="flex items-center gap-1">
                      {locationActionButtons}
                    </div>
                  ) : null}
                </div>
              <div className="app-toolbar-row">
                {compactToolbar ? (
                  <div className="app-toolbar-actions gap-1.5">
                    {locationActionButtons}
                  </div>
                ) : null}
                <div className="app-toolbar-actions gap-1.5">
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleUploadFileSelection}
                  />
                  {uploadEnabled ? (
                    <UIButton
                      variant="toolbar"
                      size="toolbar"
                      disabled={!currentRemote}
                      onClick={() => uploadInputRef.current?.click()}
                    >
                      {messages.explorer.upload()}
                    </UIButton>
                  ) : null}
                  <UIButton
                    variant={showNewDirectoryInput ? "default" : "toolbar"}
                    size="toolbar"
                    onClick={() => openNewDirectoryInput(!showNewDirectoryInput)}
                  >
                    {messages.explorer.newFolder()}
                  </UIButton>
                  <UIButton
                    variant={showFilterInput ? "default" : "toolbar"}
                    size="toolbar"
                    onClick={() => openFilterInput(!showFilterInput)}
                  >
                    {messages.explorer.filter()}
                  </UIButton>
                  <UIButton
                    variant={selectionMode ? "default" : "toolbar"}
                    size="toolbar"
                    onClick={() => toggleSelectionMode(!selectionMode)}
                  >
                    {selectionMode ? messages.explorer.done() : messages.explorer.select()}
                  </UIButton>
                  {selectionMode && selectedItems.length > 0 ? (
                    <>
                      {selectedItems.length === 1 ? (
                        <UIButton size="toolbar" variant="toolbar" onClick={beginRename}>
                          {messages.common.rename()}
                        </UIButton>
                      ) : null}
                      {canBulkDownloadSelection ? (
                        <UIButton size="toolbar" variant="toolbar" onClick={() => downloadManyFromRcServe(selectedItems)}>
                          {messages.explorer.download()}
                        </UIButton>
                      ) : shouldShowSelectionDownloadCheck ? (
                        <UIButton size="toolbar" variant="toolbar" disabled className="gap-1.5 opacity-70">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          {messages.connection.checking()}
                        </UIButton>
                      ) : null}
                      <UIButton
                        size="toolbar"
                        variant={pendingTransferAction?.mode === "copy" ? "default" : "toolbar"}
                        onClick={() => beginTransfer("copy")}
                      >
                        {messages.common.copy()}
                      </UIButton>
                      <UIButton
                        size="toolbar"
                        variant={pendingTransferAction?.mode === "move" ? "default" : "toolbar"}
                        onClick={() => beginTransfer("move")}
                      >
                        {messages.common.move()}
                      </UIButton>
                      {canShareSelection ? (
                        <UIButton
                          size="toolbar"
                          variant="toolbar"
                          onClick={async () => {
                            const item = selectedItems[0]
                            const result = await publicLinkMutation.mutateAsync({
                              remote: currentRemote,
                              path: item.srcPath,
                            })
                            setPublicLink({
                              fileName: item.itemName,
                              url: result.url,
                            })
                          }}
                        >
                          {messages.explorer.shareLink()}
                        </UIButton>
                      ) : null}
                      {canSyncSelection ? (
                        <UIButton
                          size="toolbar"
                          variant={pendingTransferAction?.mode === "sync" ? "default" : "toolbar"}
                          onClick={() => beginTransfer("sync")}
                        >
                          {messages.common.sync()}
                        </UIButton>
                      ) : null}
                      <UIButton
                        size="toolbar"
                        variant="outline"
                        className="border-[color:var(--app-danger-border)] text-[color:var(--app-danger-text-strong)] hover:bg-[color:var(--app-danger-hover-focus-bg)]"
                        onClick={handleDeleteSelection}
                      >
                        {messages.common.delete()}
                      </UIButton>
                    </>
                  ) : null}
                </div>
              </div>
              {selectionMode ? (
                <p className="text-xs text-[color:var(--app-text-soft)]">
                  {selectedItems.length > 0
                    ? messages.common.itemsSelected(selectedItems.length)
                    : messages.explorer.selectItemsHint()}
                </p>
              ) : null}
              {currentRemote && showNewDirectoryInput ? (
                <div className="flex items-end gap-3">
                  <label className="flex min-w-0 flex-1 flex-col gap-2">
                    <span className="text-[13px] font-normal text-[color:var(--app-text-soft)]">{messages.explorer.newFolder()}</span>
                    <Input
                      placeholder={resolveInputExample(inputExamples.newFolderName, locale)}
                      value={newDirectoryName}
                      onChange={(event) => setNewDirectoryName(event.currentTarget.value)}
                      onKeyDown={handleTransientInputEscape}
                    />
                  </label>
                  <UIButton
                    disabled={!currentRemote || !newDirectoryName.trim()}
                    onClick={async () => {
                      await mkdirMutation.mutateAsync({
                        remote: currentRemote,
                        path: currentPath,
                        name: newDirectoryName.trim(),
                      })
                      setNewDirectoryName("")
                      openNewDirectoryInput(false)
                    }}
                  >
                    {mkdirMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {messages.common.create()}
                  </UIButton>
                </div>
              ) : null}
              {currentRemote && showFilterInput ? (
                <label className="flex flex-col gap-2">
                  <span className="text-[13px] font-normal text-[color:var(--app-text-soft)]">{messages.explorer.filter()}</span>
                  <Input
                    placeholder={messages.explorer.filterByName()}
                    value={filterText}
                    onChange={(event) => setFilterText(event.currentTarget.value)}
                    onKeyDown={handleTransientInputEscape}
                  />
                </label>
              ) : null}
            </div>
          </UICardContent>
        </UICard>
        {inspectDirectoryPath ? (
          <UICard className="app-workspace-card">
            <UICardContent className="px-3 py-3">
              <div className="flex flex-col gap-1.5">
                <div className="text-[12px] font-bold text-[color:var(--app-text-soft)]">{messages.explorer.summary()}</div>
                {inspectDirectorySizeQuery.isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-[color:var(--app-text-soft)]">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {messages.explorer.calculatingDirectorySummary()}
                  </div>
                ) : inspectDirectorySizeQuery.data ? (
                  <>
                    <div className="text-[13px] font-bold text-[color:var(--app-text)]">{inspectDirectoryPath.split("/").at(-1) || "/"}</div>
                    <div className="text-sm text-[color:var(--app-text-soft)]">{messages.explorer.path()}: {inspectDirectoryPath}</div>
                    <div className="text-sm text-[color:var(--app-text)]">{messages.explorer.files()}: {inspectDirectorySizeQuery.data.count ?? "-"}</div>
                    <div className="text-sm text-[color:var(--app-text)]">{messages.explorer.bytes()}: {formatBytes(inspectDirectorySizeQuery.data.bytes, locale)}</div>
                    {(inspectDirectorySizeQuery.data.sizeless ?? 0) > 0 ? (
                      <div className="text-sm text-[color:var(--app-text-soft)]">
                        {messages.explorer.sizeless()}: {inspectDirectorySizeQuery.data.sizeless}
                      </div>
                    ) : null}
                    <div className="pt-1">
                      <UIButton size="sm" variant="secondary" onClick={clearInspectDirectoryPath}>
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
        ) : null}
        {pendingTransferAction ? (
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
                  <UIButton
                    size="sm"
                    disabled={!currentRemote.trim()}
                    onClick={async () => {
                      const destinationRemote = currentRemote.trim()
                      const destinationPath = currentPath
                      const invalidItems = pendingTransferAction.items.filter((item) => {
                        return (
                          destinationRemote === pendingTransferAction.sourceRemote.trim() &&
                          normalizePath(resolveTargetPath(item, destinationPath, pendingTransferAction.mode)) === normalizePath(item.srcPath)
                        )
                      })

                      if (invalidItems.length > 0) {
                        notify({
                          title:
                            pendingTransferAction.mode === "sync"
                              ? messages.explorer.syncTargetInvalid()
                              : pendingTransferAction.mode === "copy"
                                ? messages.explorer.copyTargetInvalid()
                                : messages.explorer.moveTargetInvalid(),
                          message: messages.explorer.invalidTargetMessage(),
                          color: "yellow",
                        })
                        return
                      }

                      if (pendingTransferAction.mode === "move") {
                        const confirmed = await confirm({
                          title:
                            pendingTransferAction.items.length === 1 ? messages.explorer.moveItem() : messages.explorer.moveSelectedItems(),
                          message:
                            pendingTransferAction.items.length === 1
                              ? messages.explorer.moveItemMessage(pendingTransferAction.items[0]?.srcPath ?? "", destinationLabel)
                              : messages.explorer.moveSelectedItemsMessage(pendingTransferAction.items.length, destinationLabel),
                          confirmLabel: messages.common.move(),
                        })

                        if (!confirmed) {
                          return
                        }
                      }

                      if (pendingTransferAction.mode === "sync") {
                        const syncDestinationLabel = formatRemoteLocation(destinationRemote, destinationPath)
                        const confirmed = await confirm({
                          title: messages.explorer.syncDirectory(),
                          message:
                            pendingTransferAction.items.length === 1
                              ? messages.explorer.syncDirectoryMessage(pendingTransferAction.items[0]?.srcPath ?? "", syncDestinationLabel)
                              : messages.explorer.syncDirectoriesMessage(pendingTransferAction.items.length, syncDestinationLabel),
                          confirmLabel: messages.common.sync(),
                        })

                        if (!confirmed) {
                          return
                        }
                      }

                      const batchInputs = pendingTransferAction.items.map((item) => {
                        const targetPath = resolveTargetPath(item, destinationPath, pendingTransferAction.mode)
                        if (item.itemType === "dir") {
                          const method =
                            pendingTransferAction.mode === "copy"
                              ? "sync/copy"
                              : pendingTransferAction.mode === "move"
                                ? "sync/move"
                                : "sync/sync"
                          return {
                            _path: method,
                            _async: true,
                            srcFs: `${pendingTransferAction.sourceRemote}:${item.srcPath}`,
                            dstFs: `${destinationRemote}:${targetPath}`,
                          }
                        } else {
                          const method =
                            pendingTransferAction.mode === "copy" ? "operations/copyfile" : "operations/movefile"
                          return {
                            _path: method,
                            _async: true,
                            srcFs: `${pendingTransferAction.sourceRemote}:`,
                            srcRemote: item.srcPath,
                            dstFs: `${destinationRemote}:`,
                            dstRemote: targetPath,
                          }
                        }
                      })

                      await batchMutation.mutateAsync({
                        remote: destinationRemote,
                        currentPath: destinationPath,
                        inputs: batchInputs,
                      })

                      notify({
                        color: "green",
                        title:
                          pendingTransferAction.mode === "sync"
                            ? messages.explorer.syncStarted()
                            : pendingTransferAction.mode === "copy"
                              ? messages.explorer.copyStarted()
                              : messages.explorer.moveStarted(),
                        message:
                          pendingTransferAction.mode === "sync"
                            ? messages.explorer.syncStartedMessage()
                            : pendingTransferAction.items.every((item) => item.itemType === "dir")
                              ? pendingTransferAction.mode === "copy"
                                ? messages.explorer.copyDirectoryStartedMessage()
                                : messages.explorer.moveDirectoryStartedMessage()
                              : pendingTransferAction.mode === "copy"
                                ? messages.explorer.copyFileStartedMessage()
                                : messages.explorer.moveFileStartedMessage(),
                      })

                      clearPendingFileAction()
                      clearSelection()
                      setSelectionMode(false)
                    }}
                  >
                    {pendingTransferLoading ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : null}
                    {messages.explorer.applyHere()}
                  </UIButton>
                  <UIButton size="sm" variant="secondary" onClick={clearPendingFileAction}>
                    {messages.common.cancel()}
                  </UIButton>
                  </div>
                </div>
                <div className="text-sm text-[color:var(--app-text-soft)]">
                  {messages.explorer.source()}: {getPendingTransferSourceLabel(pendingTransferAction)}
                </div>
                <div className="text-sm text-[color:var(--app-text-soft)]">
                  {messages.explorer.destination()}: {getPendingTransferDestinationLabel(pendingTransferAction, currentRemote, currentPath)}
                </div>
              </div>
            </UICardContent>
          </UICard>
        ) : null}
        <Sheet open={Boolean(pendingRenameAction)} onOpenChange={(open) => !open && clearPendingFileAction()}>
          {pendingRenameAction ? (
            <SheetContent
              side="bottom"
              className="left-1/2 right-auto top-1/2 bottom-auto w-[min(92vw,420px)] -translate-x-1/2 -translate-y-1/2 rounded-[18px] border p-4"
            >
              <SheetHeader className="mb-3 pr-8">
                <SheetTitle>{messages.common.rename()}</SheetTitle>
                <SheetDescription className="break-all">
                  {pendingRenameAction.item.itemName}
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-3">
                <input
                  autoFocus
                  className="h-11 rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 text-sm text-[color:var(--app-text)] outline-none"
                  placeholder={messages.explorer.renamePlaceholder()}
                  value={pendingRenameAction.nextName}
                  onChange={(event) => {
                    const nextName = event.currentTarget.value
                    setPendingRenameAction((state) => (state ? { ...state, nextName } : state))
                  }}
                />
                <div className="flex items-center gap-2">
                  <UIButton
                    disabled={!pendingRenameAction.nextName.trim()}
                    onClick={async () => {
                      const nextName = pendingRenameAction.nextName.trim()
                      const parent = parentPath(pendingRenameAction.item.srcPath)
                      const nextPath = normalizePath(joinPath(parent, nextName))

                      if (nextName === pendingRenameAction.item.itemName) {
                        notify({
                          title: messages.explorer.renameSkipped(),
                          message: messages.explorer.renameSameName(),
                          color: "yellow",
                        })
                        return
                      }

                      if (normalizePath(nextPath) === normalizePath(pendingRenameAction.item.srcPath)) {
                        notify({
                          title: messages.explorer.renameSkipped(),
                          message: messages.explorer.renameSamePath(),
                          color: "yellow",
                        })
                        return
                      }

                      const payload = {
                        srcRemote: currentRemote,
                        currentPath,
                        dstRemote: currentRemote,
                        items: [
                          {
                            srcPath: pendingRenameAction.item.srcPath,
                            dstPath: nextPath,
                          },
                        ],
                      }

                      if (pendingRenameAction.item.itemType === "dir") {
                        await moveDirMutation.mutateAsync(payload)
                      } else {
                        await moveFileMutation.mutateAsync(payload)
                      }

                      clearPendingFileAction()
                      clearSelection()
                      setSelectionMode(false)
                    }}
                  >
                    {moveDirMutation.isPending || moveFileMutation.isPending ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {messages.common.rename()}
                  </UIButton>
                  <UIButton variant="secondary" onClick={clearPendingFileAction}>
                    {messages.common.cancel()}
                  </UIButton>
                </div>
              </div>
            </SheetContent>
          ) : null}
        </Sheet>
        {publicLink ? (
          <UICard>
            <UICardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="text-sm font-normal text-[color:var(--app-text-soft)]">{messages.explorer.shareLink()}</div>
                <div className="font-bold text-[color:var(--app-text)]">{publicLink.fileName}</div>
                <div className="text-sm text-[color:var(--app-text-soft)]">
                  {messages.explorer.shareLinkDescription()}
                </div>
                <input
                  readOnly
                  value={publicLink.url}
                  className="h-11 rounded-[10px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] px-3 text-sm text-[color:var(--app-text)] outline-none"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <UIButton
                    variant="secondary"
                    onClick={async () => {
                      await navigator.clipboard.writeText(publicLink.url)
                    }}
                  >
                    {messages.explorer.copyLink()}
                  </UIButton>
                  <UIButton asChild>
                    <a href={publicLink.url} target="_blank" rel="noreferrer">
                      {messages.explorer.openLink()}
                    </a>
                  </UIButton>
                  <UIButton variant="secondary" onClick={() => setPublicLink(null)}>
                    {messages.common.clear()}
                  </UIButton>
                </div>
              </div>
            </UICardContent>
          </UICard>
        ) : null}
        {!currentRemote ? (
          <p className="text-sm text-[color:var(--app-text-soft)]">
            {messages.explorer.chooseRemoteHint()}
          </p>
        ) : null}
        {fsInfoQuery.error ? (
          <QueryErrorAlert color="yellow" error={fsInfoQuery.error} title={messages.explorer.fsInfoUnavailable()} />
        ) : null}
        {usageQuery.error ? (
          <QueryErrorAlert
            color="yellow"
            error={usageQuery.error}
            title={messages.explorer.usageInfoUnavailable()}
          />
        ) : null}
        <MutationFeedbacks
          configs={[
            {
              key: "mkdir",
              mutation: mkdirMutation,
              successTitle: messages.explorer.directoryCreated(),
              successMessage: messages.explorer.directoryCreatedMessage(),
              errorTitle: messages.explorer.createDirectoryFailed(),
            },
            {
              key: "delete-file",
              mutation: deleteFileMutation,
              errorTitle: messages.explorer.deleteFileFailed(),
            },
            {
              key: "delete-dir",
              mutation: deleteDirMutation,
              errorTitle: messages.explorer.deleteDirectoryFailed(),
            },
            {
              key: "copy-dir",
              mutation: copyDirMutation,
              successTitle: messages.explorer.copyStarted(),
              successMessage: messages.explorer.copyDirectoryStartedMessage(),
              errorTitle: messages.explorer.copyDirectoryFailed(),
            },
            {
              key: "copy-file",
              mutation: copyFileMutation,
              successTitle: messages.explorer.copyStarted(),
              successMessage: messages.explorer.copyFileStartedMessage(),
              errorTitle: messages.explorer.copyFileFailed(),
            },
            {
              key: "move-dir",
              mutation: moveDirMutation,
              successTitle: messages.explorer.moveStarted(),
              successMessage: messages.explorer.moveDirectoryStartedMessage(),
              errorTitle: messages.explorer.moveDirectoryFailed(),
            },
            {
              key: "move-file",
              mutation: moveFileMutation,
              successTitle: messages.explorer.moveStarted(),
              successMessage: messages.explorer.moveFileStartedMessage(),
              errorTitle: messages.explorer.moveFileFailed(),
            },
            {
              key: "public-link",
              mutation: publicLinkMutation,
              successTitle: messages.explorer.shareLinkReady(),
              successMessage: messages.explorer.shareLinkReadyMessage(),
              errorTitle: messages.explorer.shareLinkFailed(),
            },
          ]}
        />
        {explorerQuery.isLoading ? (
          <LoadingState message={messages.explorer.loadingDirectory()} />
        ) : null}
        {explorerQuery.error ? (
          <QueryErrorAlert error={explorerQuery.error} title={messages.explorer.failedToLoadDirectory()} />
        ) : null}
        {explorerQuery.data ? (
          visibleItems.length > 0 ? (
            <div className="flex min-h-0 flex-1 flex-col gap-3">
              <TableShell className="app-explorer-table flex min-h-0 flex-1 flex-col p-0">
                {/* Sticky table header */}
                <div className="overflow-x-auto bg-[color:var(--app-table-head-bg)]" style={{ paddingRight: bodyScrollbarWidth }}>
                  <Table style={{ tableLayout: "fixed", width: "100%" }}>
                    <thead>
                      <TableHeadRow>
                        <TableHead className="px-3 py-1.5 text-[0.8rem]" style={{ width: "auto" }}>
                          <div className="flex items-center gap-1.5">
                        {selectionMode ? (
                          <Checkbox
                            checked={allVisibleSelected}
                            ref={(node) => {
                              if (node) {
                                node.indeterminate = !allVisibleSelected && someVisibleSelected
                              }
                            }}
                            onChange={(event) => {
                              if (event.currentTarget.checked) {
                                setSelectedPathsByTab((state) => ({
                                  ...state,
                                  [activeTabId]: visibleItems.map((item) => joinPath(currentPath, item.name)),
                                }))
                              } else {
                                clearSelection()
                              }
                            }}
                          />
                        ) : null}
                         <UIButton
                           variant="ghost"
                           size="sm"
                           onClick={() => setSortMode(nextSortMode(sortMode, "name"))}
                         >
                           {sortLabel(messages.explorer.name(), sortMode, "name")}
                         </UIButton>
                           </div>
                         </TableHead>
                         {showMetaCols ? (
                         <TableHead className="px-3 py-1.5 text-[0.8rem] text-right" style={{ width: "var(--explorer-col-size)" }}>
                           <UIButton variant="ghost" size="sm" onClick={() => setSortMode(nextSortMode(sortMode, "size"))}>{sortLabel(messages.explorer.size(), sortMode, "size")}</UIButton>
                         </TableHead>
                         ) : null}
                         {showMetaCols ? (
                         <TableHead className="px-3 py-1.5 text-[0.8rem]" style={{ width: "var(--explorer-col-modified)" }}>
                           <UIButton variant="ghost" size="sm" onClick={() => setSortMode(nextSortMode(sortMode, "modified"))}>{sortLabel(messages.explorer.modified(), sortMode, "modified")}</UIButton>
                         </TableHead>
                         ) : null}
                         {/* Toggle column — always present, fixed width */}
                         <TableHead
                           className="py-1 text-[0.8rem]"
                           style={{ width: "2rem", padding: 0, paddingRight: 4 }}
                         >
                            <UIButton
                              variant="ghost"
                              size="icon"
                              title={showMetaCols ? messages.explorer.hideDetails() : messages.explorer.showDetails()}
                              onClick={() => setShowMetaCols((v) => !v)}
                              className={`h-7 w-7 rounded-[7px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] p-0 transition-colors hover:border-[color:var(--app-interactive-selected-border)] hover:bg-[color:var(--app-hover-surface)] ${
                                showMetaCols
                                  ? "text-[color:var(--app-accent-strong)]"
                                  : "text-[color:var(--app-text-soft)]"
                              }`}
                            >
                              <IconColumns size={14} stroke={1.6} />
                            </UIButton>
                         </TableHead>
                       </TableHeadRow>
                    </thead>
                  </Table>
                </div>
                {/* Virtualized body — only renders rows in the visible viewport */}
                <div
                  ref={scrollContainerRef}
                  data-testid="explorer-scroll-container"
                  className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
                >
                  {/* Spacer that tells the browser the full scrollable height */}
                  <div style={{ height: virtualizer.getTotalSize(), position: "relative", width: "100%" }}>
                    {virtualizer.getVirtualItems().map((virtualRow) => {
                      const item = visibleItems[virtualRow.index]!
                      const itemPath = joinPath(currentPath, item.name)
                      const rowItem: PendingTransferItem = {
                        itemType: item.type,
                        itemName: item.name,
                        srcPath: itemPath,
                        mimeType: item.mimeType,
                        size: item.size,
                      }
                      const canPreviewRowItem = rowItem.itemType === "file" && rcServeAvailable && Boolean(getPreviewKind(rowItem))
                      const canDownloadRowItem = rowItem.itemType === "file" && rcServeAvailable
                      const shouldShowRcServeCheck = rowItem.itemType === "file" && isRcServeAvailabilityPending

                      return (
                        <div
                          key={`${activeTabId}:${item.path}:${item.name}`}
                          role="row"
                          data-index={virtualRow.index}
                          ref={(node) => {
                            virtualizer.measureElement(node)
                            rowRefs.current[itemPath] = node
                          }}
                          tabIndex={activeItemPath === itemPath || (!activeItemPath && virtualRow.index === 0) ? 0 : -1}
                          onFocus={() => setActiveItemState({ tabId: activeTabId, path: itemPath })}
                          onClick={(event: ReactMouseEvent<HTMLDivElement>) => {
                            const target = event.target
                            if (target instanceof HTMLElement && target.closest("button,input,label,[role='menu']")) {
                              setActiveItemState({ tabId: activeTabId, path: itemPath })
                              return
                            }

                            setActiveItemState({ tabId: activeTabId, path: itemPath })
                            event.currentTarget.focus()
                          }}
                          onKeyDown={(event) => {
                            void handleExplorerRowKeyDown(event, rowItem)
                          }}
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            width: "100%",
                            transform: `translateY(${virtualRow.start}px)`,
                          }}
                          className={cn(
                            "flex w-full items-stretch border-b border-[color:var(--app-table-row-border)] align-top transition-colors last:border-b-0 hover:bg-[color:var(--app-table-row-hover)] focus:outline-none",
                            activeItemPath === itemPath
                              ? "bg-[color:var(--app-table-row-hover)] ring-1 ring-inset ring-[color:var(--app-interactive-selected-border)]"
                              : "",
                          )}
                        >
                          {/* Name cell — flex-1 */}
                          <div
                            role="cell"
                            className="py-1.5"
                            style={{ minWidth: 0, flex: 1, paddingLeft: 10, paddingRight: 12 }}
                          >
                            <div className="flex items-center gap-1">
                              {selectionMode ? (
                                <Checkbox
                                  checked={selectedPathSet.has(itemPath)}
                                  onChange={() => toggleSelectedPath(itemPath)}
                                />
                              ) : (
                                 <DropdownMenu
                                    open={openRowActionPath === itemPath}
                                    onOpenChange={(open) => {
                                      if (open) {
                                        setOpenRowActionState({ tabId: activeTabId, path: itemPath })
                                      } else {
                                        setOpenRowActionState((current) =>
                                          current?.tabId === activeTabId && current.path === itemPath ? null : current,
                                        )
                                      }
                                    }}
                                 >
                                   <DropdownMenuTrigger asChild>
                                     <UIButton
                                       aria-label={messages.explorer.itemActions()}
                                       className="h-6 w-6 shrink-0 rounded-[7px] p-0 text-[color:var(--app-accent-strong)]"
                                       size="icon"
                                       variant="ghost"
                                     >
                                      <IconDotsVertical size={14} stroke={1.8} />
                                    </UIButton>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="w-[170px]"
                                    onCloseAutoFocus={(event) => {
                                      event.preventDefault()
                                      rowRefs.current[itemPath]?.focus()
                                    }}
                                  >
                                    {shouldShowRcServeCheck ? (
                                      <DropdownMenuItem disabled className="gap-2 opacity-70">
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        {messages.connection.checking()}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {canDownloadRowItem ? (
                                      <DropdownMenuItem onClick={() => downloadFromRcServe(rowItem)}>
                                        {messages.explorer.download()}
                                      </DropdownMenuItem>
                                    ) : null}
                                    {canPreviewRowItem ? (
                                      <DropdownMenuItem onClick={() => openMediaPreview(rowItem)}>
                                        {messages.explorer.preview()}
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem onClick={() => beginSingleTransfer("copy", rowItem)}>
                                      {messages.common.copy()}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => beginSingleTransfer("move", rowItem)}>
                                      {messages.common.move()}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => beginSingleRename(rowItem)}>
                                      {messages.common.rename()}
                                    </DropdownMenuItem>
                                    {rowItem.itemType === "dir" ? (
                                      <DropdownMenuItem onClick={() => setInspectDirectoryPath(itemPath)}>
                                        {messages.explorer.summary()}
                                      </DropdownMenuItem>
                                    ) : null}
                                      {supportsPublicLink ? (
                                        <DropdownMenuItem
                                          onClick={async () => {
                                          const result = await publicLinkMutation.mutateAsync({
                                            remote: currentRemote,
                                            path: rowItem.srcPath,
                                          })
                                          setPublicLink({
                                            fileName: rowItem.itemName,
                                            url: result.url,
                                          })
                                          setSelectionMode(false)
                                          clearSelection()
                                        }}
                                        >
                                          {messages.explorer.shareLink()}
                                        </DropdownMenuItem>
                                      ) : null}
                                      {syncEnabled && rowItem.itemType === "dir" ? (
                                        <DropdownMenuItem onClick={() => beginSingleTransfer("sync", rowItem)}>
                                          {messages.common.sync()}
                                        </DropdownMenuItem>
                                      ) : null}
                                    <DropdownMenuItem
                                      className="text-[color:var(--app-danger-text-strong)] focus:bg-[color:var(--app-danger-hover-focus-bg)] focus:text-[color:var(--app-danger-hover-focus-text)]"
                                      onClick={() => void handleSingleDelete(rowItem)}
                                    >
                                      {messages.common.delete()}
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  {item.type === "dir" ? (
                                    <button
                                      title={item.name}
                                      type="button"
                                      onClick={(event) => {
                                        event.stopPropagation()
                                        setCurrentPath(joinPath(currentPath, item.name))
                                      }}
                                      className="flex min-w-0 items-center gap-1 text-left transition-colors hover:text-[color:var(--app-accent)]"
                                    >
                                      <IconFolderFilled size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-accent-strong)]" />
                                      <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-normal leading-5 text-[color:var(--app-text)]">
                                        {item.name}
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="flex min-w-0 items-center gap-1">
                                      <IconFile size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-text-soft)]" />
                                      <div
                                        title={item.name}
                                        className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-normal leading-5 text-[color:var(--app-text)]"
                                      >
                                        {item.name}
                                      </div>
                                    </div>
                                  )}
                                </div>
                            </div>
                          </div>
                          {/* Size cell */}
                          {showMetaCols ? (
                          <div
                            role="cell"
                            className="whitespace-nowrap py-1.5 text-sm text-[color:var(--app-text)]"
                            style={{ width: "var(--explorer-col-size)", paddingLeft: "var(--explorer-col-pad)", paddingRight: "var(--explorer-col-pad)", display: "flex", alignItems: "center", justifyContent: "flex-end" }}
                          >
                            {item.type === "dir" ? "-" : formatBytes(item.size, locale)}
                          </div>
                          ) : null}
                          {/* Modified cell */}
                          {showMetaCols ? (
                          <div
                            role="cell"
                            className="whitespace-nowrap py-1.5 text-sm text-[color:var(--app-text)]"
                            style={{ width: "var(--explorer-col-modified)", paddingLeft: "var(--explorer-col-pad)", paddingRight: "var(--explorer-col-pad)", display: "flex", alignItems: "center" }}
                          >
                            {formatModTime(item.modTime, locale)}
                          </div>
                          ) : null}
                          {/* Toggle column placeholder — always present for layout alignment */}
                          <div role="cell" style={{ width: "2rem", flexShrink: 0 }} />
                        </div>
                      )
                    })}
                  </div>
                </div>
              </TableShell>
            </div>
          ) : (
            <EmptyState
              description={
                explorerQuery.data.items.length > 0
                  ? messages.explorer.noItemsMatchFilter()
                  : messages.explorer.currentLocationEmpty()
              }
            />
          )
        ) : null}
      </div>
    </PageShell>
  )
}

export { ExplorerPage }
