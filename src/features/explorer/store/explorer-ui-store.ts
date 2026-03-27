import { create } from "zustand"

export type PendingTransferItem = {
  itemType: "file" | "dir"
  itemName: string
  srcPath: string
  mimeType?: string
  size?: number
}

export type PendingTransferAction = {
  mode: "copy" | "move" | "sync"
  sourceRemote: string
  sourcePath: string
  items: PendingTransferItem[]
} | null

export type PendingRenameAction = {
  item: PendingTransferItem
  nextName: string
} | null

interface ExplorerUIState {
  scopeKey: string | null
  actionsByScope: Record<
    string,
    {
      pendingTransferAction: PendingTransferAction
      pendingRenameAction: PendingRenameAction
    }
  >
  inspectDirectoryPaths: Record<string, string>
  selectionModes: Record<string, boolean>
  selectedPathsByTab: Record<string, string[]>

  setScope: (scopeKey: string) => void
  setPendingTransferAction: (
    updater: PendingTransferAction | ((prev: PendingTransferAction) => PendingTransferAction),
  ) => void
  setPendingRenameAction: (
    updater: PendingRenameAction | ((prev: PendingRenameAction) => PendingRenameAction),
  ) => void
  setInspectDirectoryPaths: (
    updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void
  setSelectionModes: (
    updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void
  setSelectedPathsByTab: (
    updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>),
  ) => void
}

export const useExplorerUIStore = create<ExplorerUIState>((set) => ({
  scopeKey: null,
  actionsByScope: {},
  inspectDirectoryPaths: {},
  selectionModes: {},
  selectedPathsByTab: {},

  setScope: (scopeKey) =>
    set((state) => {
      if (state.scopeKey === scopeKey) return {}
      return {
        scopeKey,
        actionsByScope: {
          ...state.actionsByScope,
          [scopeKey]: state.actionsByScope[scopeKey] ?? {
            pendingTransferAction: null,
            pendingRenameAction: null,
          },
        },
      }
    }),
  setPendingTransferAction: (updater) =>
    set((state) => {
      if (!state.scopeKey) return {}
      const currentScopeState = state.actionsByScope[state.scopeKey]!
      return {
        actionsByScope: {
          ...state.actionsByScope,
          [state.scopeKey]: {
            ...currentScopeState,
            pendingTransferAction:
              typeof updater === "function" ? updater(currentScopeState.pendingTransferAction) : updater,
          },
        },
      }
    }),
  setPendingRenameAction: (updater) =>
    set((state) => {
      if (!state.scopeKey) return {}
      const currentScopeState = state.actionsByScope[state.scopeKey]!
      return {
        actionsByScope: {
          ...state.actionsByScope,
          [state.scopeKey]: {
            ...currentScopeState,
            pendingRenameAction:
              typeof updater === "function" ? updater(currentScopeState.pendingRenameAction) : updater,
          },
        },
      }
    }),
  setInspectDirectoryPaths: (updater) =>
    set((state) => ({
      ...state,
      inspectDirectoryPaths: typeof updater === "function" ? updater(state.inspectDirectoryPaths) : updater,
    })),
  setSelectionModes: (updater) =>
    set((state) => ({
      ...state,
      selectionModes: typeof updater === "function" ? updater(state.selectionModes) : updater,
    })),
  setSelectedPathsByTab: (updater) =>
    set((state) => ({
      ...state,
      selectedPathsByTab: typeof updater === "function" ? updater(state.selectedPathsByTab) : updater,
    })),
}))
