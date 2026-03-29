import { create } from "zustand"
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware"

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

export type MediaPreviewLayout =
  | "audio"
  | "video-landscape"
  | "video-portrait"
  | "image-landscape"
  | "image-portrait"

export type MediaPreviewState = {
  fileName: string
  kind: "image" | "audio" | "video"
  layout: MediaPreviewLayout
  path: string
  url: string
} | null

type MediaPreviewSize = {
  width: number
  height: number
}

interface ExplorerUIState {
  scopeKey: string | null
  actionsByScope: Record<
    string,
    {
      pendingTransferAction: PendingTransferAction
      pendingRenameAction: PendingRenameAction
      mediaPreview: MediaPreviewState
      mediaPreviewMinimized: boolean
    }
  >
  inspectDirectoryPaths: Record<string, string>
  selectionModes: Record<string, boolean>
  selectedPathsByTab: Record<string, string[]>
  mediaPreviewSizes: Record<MediaPreviewLayout, MediaPreviewSize>

  setScope: (scopeKey: string) => void
  setPendingTransferAction: (
    updater: PendingTransferAction | ((prev: PendingTransferAction) => PendingTransferAction),
  ) => void
  setPendingRenameAction: (
    updater: PendingRenameAction | ((prev: PendingRenameAction) => PendingRenameAction),
  ) => void
  setMediaPreview: (updater: MediaPreviewState | ((prev: MediaPreviewState) => MediaPreviewState)) => void
  setMediaPreviewMinimized: (minimized: boolean) => void
  setInspectDirectoryPaths: (
    updater: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>),
  ) => void
  setSelectionModes: (
    updater: Record<string, boolean> | ((prev: Record<string, boolean>) => Record<string, boolean>),
  ) => void
  setSelectedPathsByTab: (
    updater: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>),
  ) => void
  setMediaPreviewSize: (layout: MediaPreviewLayout, nextSize: MediaPreviewSize) => void
  clearAllMediaPreviews: () => void
}

const DEFAULT_MEDIA_PREVIEW_SIZES: Record<MediaPreviewLayout, MediaPreviewSize> = {
  audio: {
    width: 520,
    height: 240,
  },
  "video-landscape": {
    width: 720,
    height: 520,
  },
  "video-portrait": {
    width: 396,
    height: 620,
  },
  "image-landscape": {
    width: 720,
    height: 560,
  },
  "image-portrait": {
    width: 460,
    height: 720,
  },
}

const noopStorage: StateStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

function getExplorerUIStorage() {
  if (typeof window === "undefined") {
    return noopStorage
  }

  try {
    return window.localStorage
  } catch {
    return noopStorage
  }
}

export const useExplorerUIStore = create<ExplorerUIState>()(
  persist(
    (set) => ({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
      mediaPreviewSizes: DEFAULT_MEDIA_PREVIEW_SIZES,

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
                mediaPreview: null,
                mediaPreviewMinimized: false,
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
      setMediaPreview: (updater) =>
        set((state) => {
          if (!state.scopeKey) return {}
          const currentScopeState = state.actionsByScope[state.scopeKey]!
          const nextMediaPreview =
            typeof updater === "function" ? updater(currentScopeState.mediaPreview) : updater
          return {
            actionsByScope: {
              ...state.actionsByScope,
              [state.scopeKey]: {
                ...currentScopeState,
                mediaPreview: nextMediaPreview,
                mediaPreviewMinimized: nextMediaPreview ? false : false,
              },
            },
          }
        }),
      setMediaPreviewMinimized: (minimized) =>
        set((state) => {
          if (!state.scopeKey) return {}
          const currentScopeState = state.actionsByScope[state.scopeKey]!
          return {
            actionsByScope: {
              ...state.actionsByScope,
              [state.scopeKey]: {
                ...currentScopeState,
                mediaPreviewMinimized: currentScopeState.mediaPreview ? minimized : false,
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
      setMediaPreviewSize: (layout, nextSize) =>
        set((state) => ({
          mediaPreviewSizes: {
            ...state.mediaPreviewSizes,
            [layout]: nextSize,
          },
        })),
      clearAllMediaPreviews: () =>
        set((state) => ({
          actionsByScope: Object.fromEntries(
            Object.entries(state.actionsByScope).map(([scopeKey, scopeState]) => [
              scopeKey,
              {
                ...scopeState,
                mediaPreview: null,
                mediaPreviewMinimized: false,
              },
            ]),
          ),
        })),
    }),
    {
      name: "yard-explorer-ui",
      storage: createJSONStorage(getExplorerUIStorage),
      partialize: (state) => ({
        mediaPreviewSizes: state.mediaPreviewSizes,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }

        state.mediaPreviewSizes = {
          ...DEFAULT_MEDIA_PREVIEW_SIZES,
          ...state.mediaPreviewSizes,
        }
      },
    },
  ),
)
