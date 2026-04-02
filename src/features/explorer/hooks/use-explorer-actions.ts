import { useCallback } from "react"
import type { PendingTransferAction, PendingTransferItem } from "@/features/explorer/store/explorer-ui-store"
import { joinPath, normalizePath, parentPath } from "@/features/explorer/lib/path-utils"
import type { RcBatchInput } from "@/shared/api/contracts/jobs"
import type { AppMessages } from "@/shared/i18n/messages/types"

interface ConfirmFn {
  (options: {
    title: string
    message: string
    confirmLabel: string
  }): Promise<boolean>
}

interface ExplorerNotifyFn {
  (input: {
    title: string
    message: string
    color: "red" | "green" | "yellow"
  }): void
}

interface PendingMutation<TInput> {
  isPending: boolean
  mutateAsync: (input: TInput) => Promise<unknown>
}

interface ExplorerActionsOptions {
  messages: AppMessages
  currentRemote: string
  currentPath: string
  selectedItems: PendingTransferItem[]
  pendingTransferAction: PendingTransferAction
  pendingRenameAction: {
    item: PendingTransferItem
    nextName: string
  } | null
  setPendingTransferAction: (updater: PendingTransferAction | ((prev: PendingTransferAction) => PendingTransferAction)) => void
  setPendingRenameAction: (
    updater:
      | {
          item: PendingTransferItem
          nextName: string
        }
      | null
      | ((prev: {
          item: PendingTransferItem
          nextName: string
        } | null) => {
          item: PendingTransferItem
          nextName: string
        } | null),
  ) => void
  setPublicLink: (value: { fileName: string; url: string } | null) => void
  clearSelection: () => void
  setSelectionMode: (enabled: boolean) => void
  confirm: ConfirmFn
  notify: ExplorerNotifyFn
  deleteDirMutation: PendingMutation<{ remote: string; currentPath: string; targetPath: string }>
  deleteFileMutation: PendingMutation<{ remote: string; currentPath: string; targetPaths: string[] }>
  batchMutation: PendingMutation<{ remote: string; currentPath: string; inputs: RcBatchInput[] }>
  moveDirMutation: PendingMutation<{
    srcRemote: string
    currentPath: string
    dstRemote: string
    items: { srcPath: string; dstPath: string }[]
  }>
  moveFileMutation: PendingMutation<{
    srcRemote: string
    currentPath: string
    dstRemote: string
    items: { srcPath: string; dstPath: string }[]
  }>
  publicLinkMutation: PendingMutation<{ remote: string; path: string }>
}

function useExplorerActions({
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
}: ExplorerActionsOptions) {
  const clearPendingFileAction = useCallback(() => {
    setPendingTransferAction(null)
    setPendingRenameAction(null)
  }, [setPendingRenameAction, setPendingTransferAction])

  const formatRemoteLocation = useCallback((remote: string, path: string) => {
    const normalizedPath = normalizePath(path)
    return remote ? `${remote}:${normalizedPath ? normalizedPath : ""}` : normalizedPath || ""
  }, [])

  const resolveTargetPath = useCallback((
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
  }, [])

  const getPendingTransferSourceLabel = useCallback((action: NonNullable<PendingTransferAction>) => {
    if (action.items.length !== 1) {
      return `${action.items.length} items from ${action.sourceRemote}:${normalizePath(action.sourcePath) || "/"}`
    }

    const [item] = action.items
    return `${action.sourceRemote}:${normalizePath(item.srcPath) || "/"}`
  }, [])

  const getPendingTransferDestinationLabel = useCallback((
    action: NonNullable<PendingTransferAction>,
    remote: string,
    destinationPath: string,
  ) => {
    if (action.items.length !== 1) {
      return formatRemoteLocation(remote, destinationPath)
    }

    const [item] = action.items
    return formatRemoteLocation(remote, resolveTargetPath(item, destinationPath, action.mode))
  }, [formatRemoteLocation, resolveTargetPath])

  const destinationLabel = currentRemote ? formatRemoteLocation(currentRemote, currentPath) : "-"

  const beginTransfer = useCallback((mode: "copy" | "move" | "sync") => {
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
  }, [currentPath, currentRemote, selectedItems, setPendingTransferAction, setPublicLink])

  const beginRename = useCallback(() => {
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
  }, [selectedItems, setPendingRenameAction, setPendingTransferAction, setPublicLink])

  const beginSingleTransfer = useCallback((mode: "copy" | "move" | "sync", item: PendingTransferItem) => {
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
  }, [
    clearSelection,
    currentPath,
    currentRemote,
    setPendingRenameAction,
    setPendingTransferAction,
    setPublicLink,
    setSelectionMode,
  ])

  const beginSingleRename = useCallback((item: PendingTransferItem) => {
    setPublicLink(null)
    setPendingTransferAction(null)
    setPendingRenameAction({
      item,
      nextName: item.itemName,
    })
    setSelectionMode(false)
    clearSelection()
  }, [clearSelection, setPendingRenameAction, setPendingTransferAction, setPublicLink, setSelectionMode])

  const handleShareLink = useCallback(async (item: PendingTransferItem) => {
    const result = await publicLinkMutation.mutateAsync({
      remote: currentRemote,
      path: item.srcPath,
    }) as { url: string }

    setPublicLink({
      fileName: item.itemName,
      url: result.url,
    })
  }, [currentRemote, publicLinkMutation, setPublicLink])

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

  const applyPendingTransfer = useCallback(async () => {
    if (!pendingTransferAction) {
      return
    }

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

    const inputs = pendingTransferAction.items.map((item) => {
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
      }

      const method = pendingTransferAction.mode === "copy" ? "operations/copyfile" : "operations/movefile"
      return {
        _path: method,
        _async: true,
        srcFs: `${pendingTransferAction.sourceRemote}:`,
        srcRemote: item.srcPath,
        dstFs: `${destinationRemote}:`,
        dstRemote: targetPath,
      }
    })

    await batchMutation.mutateAsync({
      remote: destinationRemote,
      currentPath: destinationPath,
      inputs,
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
  }, [
    batchMutation,
    clearPendingFileAction,
    clearSelection,
    confirm,
    currentPath,
    currentRemote,
    destinationLabel,
    formatRemoteLocation,
    messages.common,
    messages.explorer,
    notify,
    pendingTransferAction,
    resolveTargetPath,
    setSelectionMode,
  ])

  const submitRename = useCallback(async () => {
    if (!pendingRenameAction) {
      return
    }

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
  }, [
    clearPendingFileAction,
    clearSelection,
    currentPath,
    currentRemote,
    messages.explorer,
    moveDirMutation,
    moveFileMutation,
    notify,
    pendingRenameAction,
    setSelectionMode,
  ])

  return {
    clearPendingFileAction,
    resolveTargetPath,
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
  }
}

export { useExplorerActions }
