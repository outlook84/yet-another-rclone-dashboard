import { IconArrowUp, IconCopy, IconHome, IconPencil, IconRefresh } from "@tabler/icons-react"
import { Loader2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent as ReactKeyboardEvent } from "react"
import { useVirtualizer } from "@tanstack/react-virtual"
import { useExplorerCopyDirMutation } from "@/features/explorer/api/use-explorer-copy-dir-mutation"
import { ExplorerDirectorySummaryCard } from "@/features/explorer/components/explorer-directory-summary-card"
import { ExplorerFileTable } from "@/features/explorer/components/explorer-file-table"
import { ExplorerPendingTransferCard } from "@/features/explorer/components/explorer-pending-transfer-card"
import { ExplorerPublicLinkCard } from "@/features/explorer/components/explorer-public-link-card"
import { ExplorerRenameSheet } from "@/features/explorer/components/explorer-rename-sheet"
import { ExplorerToolbar } from "@/features/explorer/components/explorer-toolbar"
import { useExplorerActions } from "@/features/explorer/hooks/use-explorer-actions"
import { useExplorerKeyboardNavigation } from "@/features/explorer/hooks/use-explorer-keyboard-navigation"
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
} from "@/features/explorer/lib/display-utils"
import { getExplorerMediaKind } from "@/features/explorer/lib/media-kind"
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
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { useI18n } from "@/shared/i18n"
import { useMediaQuery } from "@/shared/hooks/use-media-query"
import { useConnectionStore } from "@/shared/store/connection-store"
import { usePageChromeStore } from "@/shared/store/page-chrome-store"
import { startManagedUpload } from "@/features/uploads/lib/upload-manager"
import { useUploadCenterStore } from "@/features/uploads/store/upload-center-store"
import {
  useExplorerUIStore,
  type MediaPreviewLayout,
  type MediaPreviewState,
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

function getPreviewKind(item: PendingTransferItem): NonNullable<MediaPreviewState>["kind"] | null {
  return getExplorerMediaKind({ name: item.itemName, mimeType: item.mimeType })
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

  const {
    clearPendingFileAction,
    getPendingTransferSourceLabel,
    getPendingTransferDestinationLabel,
    beginTransfer,
    beginRename,
    beginSingleTransfer,
    beginSingleRename,
    handleShareLink,
    handleSingleDelete,
    handleDeleteSelection,
    applyPendingTransfer,
    submitRename,
  } = useExplorerActions({
    messages,
    currentRemote,
    currentPath,
    selectedItems,
    pendingTransferAction,
    pendingRenameAction,
    setPendingTransferAction,
    setPendingRenameAction,
    setPublicLink,
    clearSelection,
    setSelectionMode,
    confirm,
    notify,
    deleteDirMutation,
    deleteFileMutation,
    batchMutation,
    moveDirMutation,
    moveFileMutation,
    publicLinkMutation,
  })

  const { handleExplorerRowKeyDown, activateExplorerTab } = useExplorerKeyboardNavigation({
    activeTabId,
    activeItemIndex,
    visibleItems,
    visibleItemPaths,
    activeItemPath,
    currentRemote,
    currentPath,
    selectionMode,
    selectedItemsLength: selectedItems.length,
    openRowActionPath,
    publicLinkOpen: Boolean(publicLink),
    pendingRenameOpen: Boolean(pendingRenameAction),
    pendingTransferOpen: Boolean(pendingTransferAction),
    showNewDirectoryInput,
    showFilterInput,
    isPathEditing,
    inspectDirectoryPath,
    fullPathLabel,
    scrollContainerRef,
    rowRefs,
    virtualizer,
    setCurrentPath,
    setActiveItemState,
    setOpenRowActionState,
    clearSelection,
    setSelectionMode,
    clearInspectDirectoryPath,
    clearPendingFileAction,
    setPublicLink,
    openNewDirectoryInput,
    setNewDirectoryName,
    setShowFilterInput,
    setFilterText,
    setLocationDraft,
    setIsPathEditing,
    activateTab,
    handleSingleDelete,
    handleDeleteSelection,
  })

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

  const selectionActionButtons =
    selectionMode && selectedItems.length > 0 ? (
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
          <UIButton size="toolbar" variant="toolbar" onClick={() => void handleShareLink(selectedItems[0]!)}>
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
    ) : null

  const createDirectory = useCallback(async () => {
    if (!currentRemote || !newDirectoryName.trim()) {
      return
    }

    await mkdirMutation.mutateAsync({
      remote: currentRemote,
      path: currentPath,
      name: newDirectoryName.trim(),
    })
    setNewDirectoryName("")
    openNewDirectoryInput(false)
  }, [currentPath, currentRemote, mkdirMutation, newDirectoryName, openNewDirectoryInput])

  const copyPublicLink = useCallback(async () => {
    if (!publicLink) {
      return
    }

    await navigator.clipboard.writeText(publicLink.url)
  }, [publicLink])

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
        <ExplorerToolbar
          messages={messages}
          locale={locale}
          compactHeader={compactHeader}
          compactToolbar={compactToolbar}
          headerStorage={headerStorage}
          mobileSessionsOpened={mobileSessionsOpened}
          setMobileSessionsOpened={setMobileSessionsOpened}
          tabLabels={tabLabels}
          activeTabId={activeTabId}
          tabsCount={tabs.length}
          activeTabLabel={activeTabLabel}
          usageSummaryLabel={usageSummaryLabel}
          hoveredTabId={hoveredTabId}
          setHoveredTabId={setHoveredTabId}
          onActivateTab={activateExplorerTab}
          onCloseTab={closeTab}
          onAddTab={() => addTab({ remote: currentRemote, path: currentPath })}
          isPathEditing={isPathEditing}
          locationDraft={locationDraft}
          setLocationDraft={setLocationDraft}
          applyLocationDraft={applyLocationDraft}
          fullPathLabel={fullPathLabel}
          setIsPathEditing={setIsPathEditing}
          remoteOptions={remoteOptions}
          currentRemote={currentRemote}
          onSelectRemote={(remote) => {
            setCurrentRemote(remote)
            setCurrentPath("")
          }}
          pathNodes={pathNodes}
          locationActionButtons={locationActionButtons}
          uploadInputRef={uploadInputRef}
          handleUploadFileSelection={handleUploadFileSelection}
          uploadEnabled={uploadEnabled}
          currentRemoteAvailable={Boolean(currentRemote)}
          showNewDirectoryInput={showNewDirectoryInput}
          openNewDirectoryInput={openNewDirectoryInput}
          showFilterInput={showFilterInput}
          openFilterInput={openFilterInput}
          selectionMode={selectionMode}
          toggleSelectionMode={toggleSelectionMode}
          selectedItemsCount={selectedItems.length}
          selectionActionButtons={selectionActionButtons}
          newDirectoryName={newDirectoryName}
          setNewDirectoryName={setNewDirectoryName}
          handleTransientInputEscape={handleTransientInputEscape}
          createDirectory={createDirectory}
          filterText={filterText}
          setFilterText={setFilterText}
        />
        {inspectDirectoryPath ? (
          <ExplorerDirectorySummaryCard
            messages={messages}
            locale={locale}
            inspectDirectoryPath={inspectDirectoryPath}
            isLoading={inspectDirectorySizeQuery.isLoading}
            data={inspectDirectorySizeQuery.data}
            onClear={clearInspectDirectoryPath}
          />
        ) : null}
        {pendingTransferAction ? (
          <ExplorerPendingTransferCard
            messages={messages}
            currentRemote={currentRemote}
            pendingTransferAction={pendingTransferAction}
            pendingTransferLoading={pendingTransferLoading}
            sourceLabel={getPendingTransferSourceLabel(pendingTransferAction)}
            destinationLabel={getPendingTransferDestinationLabel(pendingTransferAction, currentRemote, currentPath)}
            onApply={() => void applyPendingTransfer()}
            onCancel={clearPendingFileAction}
          />
        ) : null}
        <ExplorerRenameSheet
          messages={messages}
          pendingRenameAction={pendingRenameAction}
          isPending={moveDirMutation.isPending || moveFileMutation.isPending}
          onOpenChange={(open) => !open && clearPendingFileAction()}
          onNextNameChange={(nextName) => {
            setPendingRenameAction((state) => (state ? { ...state, nextName } : state))
          }}
          onSubmit={() => void submitRename()}
          onCancel={clearPendingFileAction}
        />
        {publicLink ? (
          <ExplorerPublicLinkCard
            messages={messages}
            publicLink={publicLink}
            onCopy={() => void copyPublicLink()}
            onClear={() => setPublicLink(null)}
          />
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
            <ExplorerFileTable
              messages={messages}
              locale={locale}
              bodyScrollbarWidth={bodyScrollbarWidth}
              selectionMode={selectionMode}
              allVisibleSelected={allVisibleSelected}
              someVisibleSelected={someVisibleSelected}
              activeTabId={activeTabId}
              currentPath={currentPath}
              visibleItems={visibleItems}
              sortMode={sortMode}
              setSortMode={setSortMode}
              showMetaCols={showMetaCols}
              setShowMetaCols={setShowMetaCols}
              setSelectedPathsByTab={setSelectedPathsByTab}
              clearSelection={clearSelection}
              scrollContainerRef={scrollContainerRef}
              virtualizer={virtualizer}
              rowRefs={rowRefs}
              activeItemPath={activeItemPath}
              setActiveItemState={setActiveItemState}
              handleExplorerRowKeyDown={handleExplorerRowKeyDown}
              selectedPathSet={selectedPathSet}
              toggleSelectedPath={toggleSelectedPath}
              openRowActionPath={openRowActionPath}
              setOpenRowActionState={setOpenRowActionState}
              isRcServeAvailabilityPending={isRcServeAvailabilityPending}
              rcServeAvailable={rcServeAvailable}
              canPreviewItem={(item) => Boolean(getPreviewKind(item))}
              onDownload={downloadFromRcServe}
              onPreview={openMediaPreview}
              onBeginSingleTransfer={beginSingleTransfer}
              onBeginSingleRename={beginSingleRename}
              onInspectDirectory={setInspectDirectoryPath}
              supportsPublicLink={supportsPublicLink}
              onShareLink={async (item) => {
                await handleShareLink(item)
                setSelectionMode(false)
                clearSelection()
              }}
              syncEnabled={syncEnabled}
              onDelete={(item) => {
                void handleSingleDelete(item)
              }}
              onNavigateDirectory={(name) => setCurrentPath(joinPath(currentPath, name))}
            />
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
