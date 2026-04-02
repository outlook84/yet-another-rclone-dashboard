import { IconColumns, IconDotsVertical, IconFile, IconFolderFilled, IconMusic, IconPhoto, IconVideo } from "@tabler/icons-react"
import { Loader2 } from "lucide-react"
import type { Dispatch, MutableRefObject, RefObject, SetStateAction } from "react"
import type { MouseEvent as ReactMouseEvent } from "react"
import type { Virtualizer } from "@tanstack/react-virtual"
import type { ExplorerItem } from "@/shared/api/contracts/explorer"
import type { AppMessages } from "@/shared/i18n/messages/types"
import type { SortMode } from "@/features/explorer/lib/display-utils"
import type { PendingTransferItem } from "@/features/explorer/store/explorer-ui-store"
import { formatBytes, formatModTime, nextSortMode, sortLabel } from "@/features/explorer/lib/display-utils"
import { getExplorerMediaKind } from "@/features/explorer/lib/media-kind"
import { joinPath } from "@/features/explorer/lib/path-utils"
import { cn } from "@/shared/lib/cn"
import { Checkbox } from "@/shared/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import { Button as UIButton } from "@/shared/components/ui/button"
import { Table, TableHead, TableHeadRow, TableShell } from "@/shared/components/ui/table"

type ExplorerRowUiState = {
  tabId: string
  path: string
} | null

function ExplorerItemIcon({ item }: { item: ExplorerItem }) {
  if (item.type === "dir") {
    return <IconFolderFilled size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-accent-strong)]" />
  }

  const mediaKind = getExplorerMediaKind({ name: item.name, mimeType: item.mimeType })
  if (mediaKind === "image") {
    return <IconPhoto size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-text-soft)]" />
  }
  if (mediaKind === "audio") {
    return <IconMusic size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-text-soft)]" />
  }
  if (mediaKind === "video") {
    return <IconVideo size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-text-soft)]" />
  }

  return <IconFile size={14} stroke={1.8} className="shrink-0 text-[color:var(--app-text-soft)]" />
}

interface ExplorerFileTableProps {
  messages: AppMessages
  locale: string
  bodyScrollbarWidth: number
  selectionMode: boolean
  allVisibleSelected: boolean
  someVisibleSelected: boolean
  activeTabId: string
  currentPath: string
  visibleItems: ExplorerItem[]
  sortMode: SortMode
  setSortMode: (mode: SortMode) => void
  showMetaCols: boolean
  setShowMetaCols: Dispatch<SetStateAction<boolean>>
  setSelectedPathsByTab: (updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void
  clearSelection: () => void
  scrollContainerRef: RefObject<HTMLDivElement | null>
  virtualizer: Virtualizer<HTMLDivElement, Element>
  rowRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
  activeItemPath: string | null
  setActiveItemState: (state: ExplorerRowUiState | ((current: ExplorerRowUiState) => ExplorerRowUiState)) => void
  handleExplorerRowKeyDown: (event: React.KeyboardEvent<HTMLDivElement>, item: PendingTransferItem) => Promise<void>
  selectedPathSet: Set<string>
  toggleSelectedPath: (path: string) => void
  openRowActionPath: string | null
  setOpenRowActionState: (state: ExplorerRowUiState | ((current: ExplorerRowUiState) => ExplorerRowUiState)) => void
  isRcServeAvailabilityPending: boolean
  rcServeAvailable: boolean
  canPreviewItem: (item: PendingTransferItem) => boolean
  onDownload: (item: PendingTransferItem) => void
  onPreview: (item: PendingTransferItem) => void
  onBeginSingleTransfer: (mode: "copy" | "move" | "sync", item: PendingTransferItem) => void
  onBeginSingleRename: (item: PendingTransferItem) => void
  onInspectDirectory: (path: string) => void
  supportsPublicLink: boolean
  onShareLink: (item: PendingTransferItem) => void | Promise<void>
  syncEnabled: boolean
  onDelete: (item: PendingTransferItem) => void
  onNavigateDirectory: (name: string) => void
}

function ExplorerFileTable({
  messages,
  locale,
  bodyScrollbarWidth,
  selectionMode,
  allVisibleSelected,
  someVisibleSelected,
  activeTabId,
  currentPath,
  visibleItems,
  sortMode,
  setSortMode,
  showMetaCols,
  setShowMetaCols,
  setSelectedPathsByTab,
  clearSelection,
  scrollContainerRef,
  virtualizer,
  rowRefs,
  activeItemPath,
  setActiveItemState,
  handleExplorerRowKeyDown,
  selectedPathSet,
  toggleSelectedPath,
  openRowActionPath,
  setOpenRowActionState,
  isRcServeAvailabilityPending,
  rcServeAvailable,
  canPreviewItem,
  onDownload,
  onPreview,
  onBeginSingleTransfer,
  onBeginSingleRename,
  onInspectDirectory,
  supportsPublicLink,
  onShareLink,
  syncEnabled,
  onDelete,
  onNavigateDirectory,
}: ExplorerFileTableProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <TableShell className="app-explorer-table flex min-h-0 flex-1 flex-col p-0">
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
                    <UIButton variant="ghost" size="sm" onClick={() => setSortMode(nextSortMode(sortMode, "name"))}>
                      {sortLabel(messages.explorer.name(), sortMode, "name")}
                    </UIButton>
                  </div>
                </TableHead>
                {showMetaCols ? (
                  <TableHead className="px-3 py-1.5 text-[0.8rem] text-right" style={{ width: "var(--explorer-col-size)" }}>
                    <UIButton variant="ghost" size="sm" onClick={() => setSortMode(nextSortMode(sortMode, "size"))}>
                      {sortLabel(messages.explorer.size(), sortMode, "size")}
                    </UIButton>
                  </TableHead>
                ) : null}
                {showMetaCols ? (
                  <TableHead className="px-3 py-1.5 text-[0.8rem]" style={{ width: "var(--explorer-col-modified)" }}>
                    <UIButton variant="ghost" size="sm" onClick={() => setSortMode(nextSortMode(sortMode, "modified"))}>
                      {sortLabel(messages.explorer.modified(), sortMode, "modified")}
                    </UIButton>
                  </TableHead>
                ) : null}
                <TableHead className="py-1 text-[0.8rem]" style={{ width: "2rem", padding: 0, paddingRight: 4 }}>
                  <UIButton
                    variant="ghost"
                    size="icon"
                    title={showMetaCols ? messages.explorer.hideDetails() : messages.explorer.showDetails()}
                    onClick={() => setShowMetaCols((value) => !value)}
                    className={cn(
                      "h-7 w-7 rounded-[7px] border border-[color:var(--app-border)] bg-[color:var(--app-panel-strong)] p-0 transition-colors hover:border-[color:var(--app-interactive-selected-border)] hover:bg-[color:var(--app-hover-surface)]",
                      showMetaCols ? "text-[color:var(--app-accent-strong)]" : "text-[color:var(--app-text-soft)]",
                    )}
                  >
                    <IconColumns size={14} stroke={1.6} />
                  </UIButton>
                </TableHead>
              </TableHeadRow>
            </thead>
          </Table>
        </div>
        <div
          ref={scrollContainerRef}
          data-testid="explorer-scroll-container"
          className="min-h-0 flex-1 overflow-x-auto overflow-y-auto"
        >
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
              const canPreviewRowItem = rowItem.itemType === "file" && rcServeAvailable && canPreviewItem(rowItem)
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
                  <div
                    role="cell"
                    className="py-1.5"
                    style={{ minWidth: 0, flex: 1, paddingLeft: 10, paddingRight: 12 }}
                  >
                    <div className="flex items-center gap-1">
                      {selectionMode ? (
                        <Checkbox checked={selectedPathSet.has(itemPath)} onChange={() => toggleSelectedPath(itemPath)} />
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
                              <DropdownMenuItem onClick={() => onDownload(rowItem)}>
                                {messages.explorer.download()}
                              </DropdownMenuItem>
                            ) : null}
                            {canPreviewRowItem ? (
                              <DropdownMenuItem onClick={() => onPreview(rowItem)}>
                                {messages.explorer.preview()}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem onClick={() => onBeginSingleTransfer("copy", rowItem)}>
                              {messages.common.copy()}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onBeginSingleTransfer("move", rowItem)}>
                              {messages.common.move()}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => onBeginSingleRename(rowItem)}>
                              {messages.common.rename()}
                            </DropdownMenuItem>
                            {rowItem.itemType === "dir" ? (
                              <DropdownMenuItem onClick={() => onInspectDirectory(itemPath)}>
                                {messages.explorer.summary()}
                              </DropdownMenuItem>
                            ) : null}
                            {supportsPublicLink ? (
                              <DropdownMenuItem onClick={() => void onShareLink(rowItem)}>
                                {messages.explorer.shareLink()}
                              </DropdownMenuItem>
                            ) : null}
                            {syncEnabled && rowItem.itemType === "dir" ? (
                              <DropdownMenuItem onClick={() => onBeginSingleTransfer("sync", rowItem)}>
                                {messages.common.sync()}
                              </DropdownMenuItem>
                            ) : null}
                            <DropdownMenuItem
                              className="text-[color:var(--app-danger-text-strong)] focus:bg-[color:var(--app-danger-hover-focus-bg)] focus:text-[color:var(--app-danger-hover-focus-text)]"
                              onClick={() => onDelete(rowItem)}
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
                            onNavigateDirectory(item.name)
                          }}
                          className="flex min-w-0 items-center gap-1 text-left transition-colors hover:text-[color:var(--app-accent)]"
                          >
                            <ExplorerItemIcon item={item} />
                            <span className="block min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-sm font-normal leading-5 text-[color:var(--app-text)]">
                              {item.name}
                            </span>
                          </button>
                        ) : (
                          <div className="flex min-w-0 items-center gap-1">
                            <ExplorerItemIcon item={item} />
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
                  {showMetaCols ? (
                    <div
                      role="cell"
                      className="whitespace-nowrap py-1.5 text-sm text-[color:var(--app-text)]"
                      style={{
                        width: "var(--explorer-col-size)",
                        paddingLeft: "var(--explorer-col-pad)",
                        paddingRight: "var(--explorer-col-pad)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      {item.type === "dir" ? "-" : formatBytes(item.size, locale)}
                    </div>
                  ) : null}
                  {showMetaCols ? (
                    <div
                      role="cell"
                      className="whitespace-nowrap py-1.5 text-sm text-[color:var(--app-text)]"
                      style={{
                        width: "var(--explorer-col-modified)",
                        paddingLeft: "var(--explorer-col-pad)",
                        paddingRight: "var(--explorer-col-pad)",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      {formatModTime(item.modTime, locale)}
                    </div>
                  ) : null}
                  <div role="cell" style={{ width: "2rem", flexShrink: 0 }} />
                </div>
              )
            })}
          </div>
        </div>
      </TableShell>
    </div>
  )
}

export { ExplorerFileTable }
