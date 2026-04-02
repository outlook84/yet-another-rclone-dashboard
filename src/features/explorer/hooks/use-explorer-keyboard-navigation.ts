import { useCallback, useEffect, useRef } from "react"
import type { MutableRefObject, RefObject } from "react"
import type { Virtualizer } from "@tanstack/react-virtual"
import { joinPath, parentPath } from "@/features/explorer/lib/path-utils"
import type { PendingTransferItem } from "@/features/explorer/store/explorer-ui-store"

type ExplorerRowUiState = {
  tabId: string
  path: string
} | null

interface ExplorerKeyboardNavigationOptions {
  activeTabId: string
  activeItemIndex: number
  visibleItems: {
    name: string
    type: "file" | "dir"
    mimeType?: string
    size?: number
  }[]
  visibleItemPaths: string[]
  activeItemPath: string | null
  currentRemote: string
  currentPath: string
  selectionMode: boolean
  selectedItemsLength: number
  openRowActionPath: string | null
  publicLinkOpen: boolean
  pendingRenameOpen: boolean
  pendingTransferOpen: boolean
  showNewDirectoryInput: boolean
  showFilterInput: boolean
  isPathEditing: boolean
  inspectDirectoryPath: string
  fullPathLabel: string
  scrollContainerRef: RefObject<HTMLDivElement | null>
  rowRefs: MutableRefObject<Record<string, HTMLDivElement | null>>
  virtualizer: Virtualizer<HTMLDivElement, Element>
  setCurrentPath: (path: string) => void
  setActiveItemState: (state: ExplorerRowUiState | ((current: ExplorerRowUiState) => ExplorerRowUiState)) => void
  setOpenRowActionState: (state: ExplorerRowUiState | ((current: ExplorerRowUiState) => ExplorerRowUiState)) => void
  clearSelection: () => void
  setSelectionMode: (enabled: boolean) => void
  clearInspectDirectoryPath: () => void
  clearPendingFileAction: () => void
  setPublicLink: (value: { fileName: string; url: string } | null) => void
  openNewDirectoryInput: (enabled: boolean) => void
  setNewDirectoryName: (value: string) => void
  setShowFilterInput: (value: boolean) => void
  setFilterText: (value: string) => void
  setLocationDraft: (value: string) => void
  setIsPathEditing: (value: boolean) => void
  activateTab: (tabId: string) => void
  handleSingleDelete: (item: PendingTransferItem) => Promise<void>
  handleDeleteSelection: () => Promise<void>
}

function useExplorerKeyboardNavigation({
  activeTabId,
  activeItemIndex,
  visibleItems,
  visibleItemPaths,
  activeItemPath,
  currentRemote,
  currentPath,
  selectionMode,
  selectedItemsLength,
  openRowActionPath,
  publicLinkOpen,
  pendingRenameOpen,
  pendingTransferOpen,
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
}: ExplorerKeyboardNavigationOptions) {
  const pendingFocusPathRef = useRef<string | null>(null)
  const pendingFocusFrameRef = useRef<number | null>(null)
  const didMountRef = useRef(false)
  const prevTabIdRef = useRef(activeTabId)

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
  }, [activeItemPath, rowRefs, visibleItems])

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
  }, [activeTabId, rowRefs, setActiveItemState, virtualizer, visibleItemPaths])

  const closeTransientExplorerUi = useCallback(() => {
    let closed = false

    if (publicLinkOpen) {
      setPublicLink(null)
      closed = true
    }

    if (openRowActionPath) {
      setOpenRowActionState(null)
      closed = true
    }

    if (pendingRenameOpen || pendingTransferOpen) {
      clearPendingFileAction()
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
    clearPendingFileAction,
    clearSelection,
    fullPathLabel,
    inspectDirectoryPath,
    isPathEditing,
    openNewDirectoryInput,
    openRowActionPath,
    pendingRenameOpen,
    pendingTransferOpen,
    publicLinkOpen,
    selectionMode,
    setFilterText,
    setIsPathEditing,
    setLocationDraft,
    setNewDirectoryName,
    setOpenRowActionState,
    setPublicLink,
    setSelectionMode,
    setShowFilterInput,
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
      focusItemAtIndex(activeItemIndex < 0 ? 0 : activeItemIndex + 1)
      return
    }

    if (input.key === "ArrowUp") {
      input.preventDefault()
      focusItemAtIndex(activeItemIndex < 0 ? 0 : activeItemIndex - 1)
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
      focusItemAtIndex(activeItemIndex < 0 ? pageSize : activeItemIndex + pageSize)
      return
    }

    if (input.key === "PageUp") {
      input.preventDefault()
      const pageSize = Math.max(Math.floor((scrollContainerRef.current?.clientHeight ?? 400) / 40), 1)
      focusItemAtIndex(activeItemIndex < 0 ? 0 : activeItemIndex - pageSize)
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
      if (selectionMode && selectedItemsLength > 0) {
        input.preventDefault()
        await handleDeleteSelection()
        return
      }

      input.preventDefault()
      await handleSingleDelete(currentRowItem)
    }
  }, [
    activeItemIndex,
    activeTabId,
    closeTransientExplorerUi,
    currentPath,
    focusItemAtIndex,
    handleDeleteSelection,
    handleSingleDelete,
    scrollContainerRef,
    selectedItemsLength,
    selectionMode,
    setCurrentPath,
    setOpenRowActionState,
    visibleItemPaths.length,
  ])

  const handleExplorerRowKeyDown = useCallback(async (
    event: React.KeyboardEvent<HTMLDivElement>,
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

  const activateExplorerTab = useCallback((tabId: string) => {
    pendingFocusPathRef.current = null
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest("[role='row']")) {
      document.activeElement.blur()
    }
    setActiveItemState(null)
    setOpenRowActionState(null)
    activateTab(tabId)
  }, [activateTab, setActiveItemState, setOpenRowActionState])

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

  return {
    handleExplorerRowKeyDown,
    activateExplorerTab,
  }
}

export { useExplorerKeyboardNavigation }
