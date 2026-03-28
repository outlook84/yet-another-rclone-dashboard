// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useExplorerStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("keeps independent sessions per scope", async () => {
    const { useExplorerStore } = await import("@/features/explorer/store/explorer-store")

    useExplorerStore.getState().setScope("scope-a")
    useExplorerStore.getState().setLocation("remote-a:", "folder-a")
    const firstTabId = useExplorerStore.getState().activeTabId

    useExplorerStore.getState().setScope("scope-b")
    useExplorerStore.getState().setLocation("remote-b:", "folder-b")

    expect(useExplorerStore.getState()).toMatchObject({
      scopeKey: "scope-b",
      currentRemote: "remote-b:",
      currentPath: "folder-b",
    })

    useExplorerStore.getState().setScope("scope-a")

    expect(useExplorerStore.getState()).toMatchObject({
      scopeKey: "scope-a",
      activeTabId: firstTabId,
      currentRemote: "remote-a:",
      currentPath: "folder-a",
    })
  })

  it("activates and falls back correctly when tabs are closed", async () => {
    const { useExplorerStore } = await import("@/features/explorer/store/explorer-store")

    useExplorerStore.getState().setScope("scope-a")
    const firstTabId = useExplorerStore.getState().activeTabId
    useExplorerStore.getState().setLocation("remote-a:", "root")
    useExplorerStore.getState().addTab({ remote: "remote-b:", path: "nested" })
    const secondTabId = useExplorerStore.getState().activeTabId

    expect(useExplorerStore.getState().tabs).toHaveLength(2)
    expect(useExplorerStore.getState().currentRemote).toBe("remote-b:")

    useExplorerStore.getState().closeTab(secondTabId)

    expect(useExplorerStore.getState()).toMatchObject({
      activeTabId: firstTabId,
      currentRemote: "remote-a:",
      currentPath: "root",
    })
    expect(useExplorerStore.getState().tabs).toHaveLength(1)

    useExplorerStore.getState().closeTab(firstTabId)

    expect(useExplorerStore.getState().tabs).toHaveLength(1)
    expect(useExplorerStore.getState().activeTabId).not.toBe(firstTabId)
    expect(useExplorerStore.getState()).toMatchObject({
      currentRemote: "",
      currentPath: "",
    })
  })

  it("updates only the active tab when location and sort change", async () => {
    const { useExplorerStore } = await import("@/features/explorer/store/explorer-store")

    useExplorerStore.getState().setScope("scope-a")
    const firstTabId = useExplorerStore.getState().activeTabId
    useExplorerStore.getState().setLocation("remote-a:", "root")
    useExplorerStore.getState().addTab({ remote: "remote-b:", path: "child" })
    const secondTabId = useExplorerStore.getState().activeTabId

    useExplorerStore.getState().setSortMode("size-desc")
    useExplorerStore.getState().activateTab(firstTabId)
    useExplorerStore.getState().setCurrentPath("updated-root")

    const tabs = useExplorerStore.getState().tabs
    expect(tabs.find((tab) => tab.id === firstTabId)).toMatchObject({
      remote: "remote-a:",
      path: "updated-root",
      sortMode: "name-asc",
    })
    expect(tabs.find((tab) => tab.id === secondTabId)).toMatchObject({
      remote: "remote-b:",
      path: "child",
      sortMode: "size-desc",
    })
  })
})
