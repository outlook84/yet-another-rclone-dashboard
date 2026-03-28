// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useStatsPollingStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("starts with the default polling interval and updates it", async () => {
    const { useStatsPollingStore } = await import("@/features/jobs/store/stats-polling-store")

    expect(useStatsPollingStore.getState().intervalMs).toBe(5000)

    useStatsPollingStore.getState().setIntervalMs(1500)

    expect(useStatsPollingStore.getState().intervalMs).toBe(1500)
  })
})
