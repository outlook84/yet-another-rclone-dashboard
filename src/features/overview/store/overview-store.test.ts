// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MemStats } from "@/shared/api/contracts/session"

const memStats: MemStats = {
  Alloc: 1,
  TotalAlloc: 2,
  Sys: 3,
  Mallocs: 4,
  Frees: 5,
  HeapAlloc: 6,
  HeapSys: 7,
  HeapIdle: 8,
  HeapInuse: 9,
  HeapReleased: 10,
  HeapObjects: 11,
  StackInuse: 12,
  StackSys: 13,
  MSpanInuse: 14,
  MSpanSys: 15,
  MCacheInuse: 16,
  MCacheSys: 17,
  BuckHashSys: 18,
  GCSys: 19,
  OtherSys: 20,
}

describe("useOverviewStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("keeps throughput history isolated by scope", async () => {
    const { useOverviewStore } = await import("@/features/overview/store/overview-store")

    useOverviewStore.getState().setScope("scope-a")
    useOverviewStore.getState().appendSpeedSample(100, 1000, 5000)
    useOverviewStore.getState().appendSpeedSample(150, 4000, 5000)

    useOverviewStore.getState().setScope("scope-b")
    useOverviewStore.getState().appendSpeedSample(200, 2000, 5000)

    expect(useOverviewStore.getState().speedHistory).toEqual([{ at: 2000, value: 200 }])

    useOverviewStore.getState().setScope("scope-a")

    expect(useOverviewStore.getState().speedHistory).toEqual([
      { at: 1000, value: 100 },
      { at: 4000, value: 150 },
    ])
  })

  it("drops samples outside the requested time window", async () => {
    const { useOverviewStore } = await import("@/features/overview/store/overview-store")

    useOverviewStore.getState().setScope("scope-a")
    useOverviewStore.getState().appendSpeedSample(100, 1000, 3000)
    useOverviewStore.getState().appendSpeedSample(200, 5000, 3000)

    expect(useOverviewStore.getState().speedHistory).toEqual([{ at: 5000, value: 200 }])
  })

  it("stores mem stats without persisting them into history state", async () => {
    const { useOverviewStore } = await import("@/features/overview/store/overview-store")

    useOverviewStore.getState().setScope("scope-a")
    useOverviewStore.getState().appendSpeedSample(100, 1000, 5000)
    useOverviewStore.getState().setMemStats(memStats)

    expect(useOverviewStore.getState().memStats).toEqual(memStats)
    expect(useOverviewStore.getState().historyByScope["scope-a"]).toEqual([{ at: 1000, value: 100 }])
  })
})
