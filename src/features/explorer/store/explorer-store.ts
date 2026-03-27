import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { SortMode } from "@/features/explorer/lib/display-utils"

interface ExplorerTab {
  id: string
  remote: string
  path: string
  sortMode: SortMode
}

interface ExplorerSession {
  tabs: ExplorerTab[]
  activeTabId: string
  currentRemote: string
  currentPath: string
}

interface ExplorerState {
  scopeKey: string | null
  sessionsByScope: Record<string, ExplorerSession>
  tabs: ExplorerTab[]
  activeTabId: string
  currentRemote: string
  currentPath: string
  setScope: (scopeKey: string) => void
  addTab: (initial?: Partial<Pick<ExplorerTab, "remote" | "path">>) => void
  closeTab: (tabId: string) => void
  activateTab: (tabId: string) => void
  setCurrentRemote: (remote: string) => void
  setCurrentPath: (path: string) => void
  setLocation: (remote: string, path: string) => void
  setSortMode: (sortMode: SortMode) => void
}

let explorerTabSequence = 1

function syncExplorerTabSequence(tabs: ExplorerTab[]) {
  const maxSequence = tabs.reduce((maxValue, tab) => {
    const suffix = Number(tab.id.replace("explorer-tab-", ""))
    return Number.isFinite(suffix) ? Math.max(maxValue, suffix) : maxValue
  }, 0)

  explorerTabSequence = Math.max(explorerTabSequence, maxSequence + 1)
}

function makeExplorerTab(initial?: Partial<Pick<ExplorerTab, "remote" | "path">>): ExplorerTab {
  const tabId = explorerTabSequence
  explorerTabSequence += 1

  return {
    id: `explorer-tab-${tabId}`,
    remote: initial?.remote ?? "",
    path: initial?.path ?? "",
    sortMode: "name-asc",
  }
}

function makeExplorerSession(initial?: Partial<Pick<ExplorerTab, "remote" | "path">>): ExplorerSession {
  const initialTab = makeExplorerTab(initial)

  return {
    tabs: [initialTab],
    activeTabId: initialTab.id,
    currentRemote: initialTab.remote,
    currentPath: initialTab.path,
  }
}

function getSession(state: Pick<ExplorerState, "scopeKey" | "sessionsByScope">) {
  if (!state.scopeKey) {
    return null
  }

  return state.sessionsByScope[state.scopeKey] ?? null
}

const useExplorerStore = create<ExplorerState>()(
  persist(
    (set) => ({
      scopeKey: null,
      sessionsByScope: {},
      tabs: [],
      activeTabId: "",
      currentRemote: "",
      currentPath: "",
      setScope: (scopeKey) =>
        set((state) => {
          if (state.scopeKey === scopeKey) {
            return {}
          }

          const session = state.sessionsByScope[scopeKey] ?? makeExplorerSession()
          return {
            scopeKey,
            sessionsByScope: state.sessionsByScope[scopeKey]
              ? state.sessionsByScope
              : {
                  ...state.sessionsByScope,
                  [scopeKey]: session,
                },
            tabs: session.tabs,
            activeTabId: session.activeTabId,
            currentRemote: session.currentRemote,
            currentPath: session.currentPath,
          }
        }),
      addTab: (initial) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()
          const tab = makeExplorerTab(initial)
          const nextSession = {
            tabs: [...session.tabs, tab],
            activeTabId: tab.id,
            currentRemote: tab.remote,
            currentPath: tab.path,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            tabs: nextSession.tabs,
            activeTabId: nextSession.activeTabId,
            currentRemote: nextSession.currentRemote,
            currentPath: nextSession.currentPath,
          }
        }),
      closeTab: (tabId) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()

          if (session.tabs.length === 1) {
            const resetSession = makeExplorerSession()
            return {
              sessionsByScope: {
                ...state.sessionsByScope,
                [state.scopeKey]: resetSession,
              },
              tabs: resetSession.tabs,
              activeTabId: resetSession.activeTabId,
              currentRemote: resetSession.currentRemote,
              currentPath: resetSession.currentPath,
            }
          }

          const closingIndex = session.tabs.findIndex((tab) => tab.id === tabId)
          const nextTabs = session.tabs.filter((tab) => tab.id !== tabId)

          if (session.activeTabId !== tabId) {
            const nextSession = {
              ...session,
              tabs: nextTabs,
            }

            return {
              sessionsByScope: {
                ...state.sessionsByScope,
                [state.scopeKey]: nextSession,
              },
              tabs: nextSession.tabs,
            }
          }

          const fallbackIndex = Math.max(0, closingIndex - 1)
          const fallbackTab = nextTabs[fallbackIndex] ?? nextTabs[0]
          const nextSession = {
            tabs: nextTabs,
            activeTabId: fallbackTab.id,
            currentRemote: fallbackTab.remote,
            currentPath: fallbackTab.path,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            tabs: nextSession.tabs,
            activeTabId: nextSession.activeTabId,
            currentRemote: nextSession.currentRemote,
            currentPath: nextSession.currentPath,
          }
        }),
      activateTab: (tabId) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()
          const nextTab = session.tabs.find((tab) => tab.id === tabId)
          if (!nextTab) {
            return {}
          }

          const nextSession = {
            ...session,
            activeTabId: nextTab.id,
            currentRemote: nextTab.remote,
            currentPath: nextTab.path,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            activeTabId: nextSession.activeTabId,
            currentRemote: nextSession.currentRemote,
            currentPath: nextSession.currentPath,
          }
        }),
      setCurrentRemote: (currentRemote) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()
          const nextTabs = session.tabs.map((tab) =>
            tab.id === session.activeTabId
              ? {
                  ...tab,
                  remote: currentRemote,
                }
              : tab,
          )
          const nextSession = {
            ...session,
            currentRemote,
            tabs: nextTabs,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            currentRemote: nextSession.currentRemote,
            tabs: nextSession.tabs,
          }
        }),
      setCurrentPath: (currentPath) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()
          const nextTabs = session.tabs.map((tab) =>
            tab.id === session.activeTabId
              ? {
                  ...tab,
                  path: currentPath,
                }
              : tab,
          )
          const nextSession = {
            ...session,
            currentPath,
            tabs: nextTabs,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            currentPath: nextSession.currentPath,
            tabs: nextSession.tabs,
          }
        }),
      setLocation: (currentRemote, currentPath) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()
          const nextTabs = session.tabs.map((tab) =>
            tab.id === session.activeTabId
              ? {
                  ...tab,
                  remote: currentRemote,
                  path: currentPath,
                }
              : tab,
          )
          const nextSession = {
            tabs: nextTabs,
            activeTabId: session.activeTabId,
            currentRemote,
            currentPath,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            currentRemote: nextSession.currentRemote,
            currentPath: nextSession.currentPath,
            tabs: nextSession.tabs,
          }
        }),
      setSortMode: (sortMode) =>
        set((state) => {
          if (!state.scopeKey) {
            return {}
          }

          const session = getSession(state) ?? makeExplorerSession()
          const nextTabs = session.tabs.map((tab) =>
            tab.id === session.activeTabId
              ? {
                  ...tab,
                  sortMode,
                }
              : tab,
          )
          const nextSession = {
            ...session,
            tabs: nextTabs,
          }

          return {
            sessionsByScope: {
              ...state.sessionsByScope,
              [state.scopeKey]: nextSession,
            },
            tabs: nextSession.tabs,
          }
        }),
    }),
    {
      name: "yard-explorer",
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }

        if (!state.sessionsByScope) {
          const fallbackSession =
            state.tabs.length > 0
              ? {
                  tabs: state.tabs.map((tab) => ({
                    ...tab,
                    sortMode: tab.sortMode ?? "name-asc",
                  })),
                  activeTabId: state.activeTabId,
                  currentRemote: state.currentRemote,
                  currentPath: state.currentPath,
                }
              : makeExplorerSession()
          state.sessionsByScope = state.scopeKey ? { [state.scopeKey]: fallbackSession } : {}
        }

        const allTabs = Object.values(state.sessionsByScope).flatMap((session) => session.tabs)

        if (allTabs.length === 0) {
          const resetSession = makeExplorerSession()
          state.sessionsByScope = state.scopeKey ? { [state.scopeKey]: resetSession } : {}
          state.tabs = resetSession.tabs
          state.activeTabId = resetSession.activeTabId
          state.currentRemote = resetSession.currentRemote
          state.currentPath = resetSession.currentPath
        }

        if (state.scopeKey) {
          const activeSession = state.sessionsByScope[state.scopeKey] ?? makeExplorerSession()
          activeSession.tabs = activeSession.tabs.map((tab) => ({
            ...tab,
            sortMode: tab.sortMode ?? "name-asc",
          }))
          state.sessionsByScope[state.scopeKey] = activeSession
          state.tabs = activeSession.tabs
          state.activeTabId = activeSession.activeTabId
          state.currentRemote = activeSession.currentRemote
          state.currentPath = activeSession.currentPath
        }

        syncExplorerTabSequence(Object.values(state.sessionsByScope).flatMap((session) => session.tabs))
      },
    },
  ),
)

export { useExplorerStore }
