import { describe, expect, it } from "vitest"

import { effectiveBytes, isInFlightWithoutProgress } from "@/features/jobs/lib/effective-bytes"

describe("effectiveBytes", () => {
  it("returns the live bytes counter for streamed transfers in flight", () => {
    expect(effectiveBytes({ bytes: 1_048_576, size: 10_000_000 })).toBe(1_048_576)
  })

  it("returns the live bytes counter for completed streamed transfers", () => {
    expect(
      effectiveBytes({
        bytes: 10_000_000,
        size: 10_000_000,
        completedAt: "2026-05-13T19:19:27Z",
      }),
    ).toBe(10_000_000)
  })

  it("falls back to size for completed server-side copies (bytes:0 + completedAt + no error)", () => {
    // This is the real-world shape returned by rclone for a successful
    // macOS local→local server-side copy. Per-transfer `bytes` stays at 0
    // for the entire life of the transfer; only `serverSideCopyBytes` on
    // the global core/stats increments.
    expect(
      effectiveBytes({
        bytes: 0,
        size: 2_366_920_044,
        completedAt: "2026-05-13T19:19:27Z",
        error: undefined,
      }),
    ).toBe(2_366_920_044)
  })

  it("treats empty-string error as no error (rclone returns '' for success)", () => {
    expect(
      effectiveBytes({
        bytes: 0,
        size: 2_366_920_044,
        completedAt: "2026-05-13T19:19:27Z",
        error: "",
      }),
    ).toBe(2_366_920_044)
  })

  it("returns 0 for in-flight server-side copies (no completedAt yet)", () => {
    expect(
      effectiveBytes({
        bytes: 0,
        size: 2_366_920_044,
      }),
    ).toBe(0)
  })

  it("returns 0 for failed transfers with bytes:0", () => {
    expect(
      effectiveBytes({
        bytes: 0,
        size: 2_366_920_044,
        completedAt: "2026-05-13T19:19:27Z",
        error: "couldn't copy from /a/b to /c/d: errno -1",
      }),
    ).toBe(0)
  })

  it("does not assume size when the transfer never completed and has no bytes", () => {
    expect(effectiveBytes({})).toBe(0)
  })

  it("preserves bytes when both bytes and size are set (preferring bytes)", () => {
    // Edge case: in case rclone ever does start reporting bytes for
    // server-side copies, the live counter should win.
    expect(
      effectiveBytes({
        bytes: 1_000_000_000,
        size: 2_000_000_000,
        completedAt: "2026-05-13T19:19:27Z",
      }),
    ).toBe(1_000_000_000)
  })
})

describe("isInFlightWithoutProgress", () => {
  it("is true for an in-flight server-side copy (bytes:0, no completedAt, size > 0)", () => {
    expect(
      isInFlightWithoutProgress({
        bytes: 0,
        size: 2_366_920_044,
      }),
    ).toBe(true)
  })

  it("is false once the transfer has completed (regardless of bytes)", () => {
    expect(
      isInFlightWithoutProgress({
        bytes: 0,
        size: 2_366_920_044,
        completedAt: "2026-05-13T19:19:27Z",
      }),
    ).toBe(false)
  })

  it("is false for a streamed transfer that has reported any bytes", () => {
    expect(
      isInFlightWithoutProgress({
        bytes: 1_000_000,
        size: 10_000_000,
      }),
    ).toBe(false)
  })

  it("is false for an item with no size (uninitialized row)", () => {
    expect(isInFlightWithoutProgress({ bytes: 0 })).toBe(false)
    expect(isInFlightWithoutProgress({})).toBe(false)
  })
})
