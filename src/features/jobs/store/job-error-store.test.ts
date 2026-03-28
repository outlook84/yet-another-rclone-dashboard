// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useJobErrorStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("resets tracked state when the source changes", async () => {
    const { useJobErrorStore } = await import("@/features/jobs/store/job-error-store")

    useJobErrorStore.getState().ingestSnapshot("source-a", {
      errors: 2,
      lastError: " first error ",
    })

    expect(useJobErrorStore.getState()).toMatchObject({
      sourceKey: "source-a",
      lastSeenErrorCount: 2,
      lastSeenErrorMessage: "first error",
      entries: [],
    })

    useJobErrorStore.getState().ingestSnapshot("source-b", {
      errors: 1,
      lastError: "other source error",
    })

    expect(useJobErrorStore.getState()).toMatchObject({
      sourceKey: "source-b",
      lastSeenErrorCount: 1,
      lastSeenErrorMessage: "other source error",
      entries: [],
    })
  })

  it("aggregates repeated errors and records new messages", async () => {
    const { useJobErrorStore } = await import("@/features/jobs/store/job-error-store")

    useJobErrorStore.setState({
      sourceKey: "source-a",
      lastSeenErrorCount: 0,
      lastSeenErrorMessage: null,
      entries: [],
    })

    useJobErrorStore.getState().ingestSnapshot("source-a", {
      errors: 2,
      lastError: "same error",
    })

    expect(useJobErrorStore.getState().entries).toHaveLength(1)
    expect(useJobErrorStore.getState().entries[0]).toMatchObject({
      message: "same error",
      totalErrors: 2,
      increment: 2,
    })

    useJobErrorStore.getState().ingestSnapshot("source-a", {
      errors: 3,
      lastError: "same error",
    })

    expect(useJobErrorStore.getState().entries).toHaveLength(1)
    expect(useJobErrorStore.getState().entries[0]).toMatchObject({
      message: "same error",
      totalErrors: 3,
      increment: 3,
    })

    useJobErrorStore.getState().ingestSnapshot("source-a", {
      errors: 5,
      lastError: "new error",
    })

    expect(useJobErrorStore.getState().entries).toHaveLength(2)
    expect(useJobErrorStore.getState().entries[0]).toMatchObject({
      message: "new error",
      totalErrors: 5,
      increment: 2,
    })
  })

  it("does not create an entry when the message is empty or count does not increase", async () => {
    const { useJobErrorStore } = await import("@/features/jobs/store/job-error-store")

    useJobErrorStore.setState({
      sourceKey: "source-a",
      lastSeenErrorCount: 2,
      lastSeenErrorMessage: "old",
      entries: [],
    })

    useJobErrorStore.getState().ingestSnapshot("source-a", {
      errors: 2,
      lastError: "still old",
    })
    useJobErrorStore.getState().ingestSnapshot("source-a", {
      errors: 3,
      lastError: "   ",
    })

    expect(useJobErrorStore.getState().entries).toEqual([])
    expect(useJobErrorStore.getState()).toMatchObject({
      lastSeenErrorCount: 3,
      lastSeenErrorMessage: null,
    })
  })
})
