// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useRemoteCleanupStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("tracks the last cleanup run per source key", async () => {
    const { useRemoteCleanupStore } = await import("@/features/remotes/store/remote-cleanup-store")

    useRemoteCleanupStore.getState().markRun("profile-a", "2026-03-28T09:00:00.000Z")
    useRemoteCleanupStore.getState().markRun("profile-b", "2026-03-28T10:00:00.000Z")
    useRemoteCleanupStore.getState().markRun("profile-a", "2026-03-28T11:00:00.000Z")

    expect(useRemoteCleanupStore.getState().lastRunAtBySource).toEqual({
      "profile-a": "2026-03-28T11:00:00.000Z",
      "profile-b": "2026-03-28T10:00:00.000Z",
    })
  })
})
