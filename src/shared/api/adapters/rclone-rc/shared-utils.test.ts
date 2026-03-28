import { describe, expect, it } from "vitest"
import {
  compareJobIdsDesc,
  compareJobRecordsDesc,
  normalizeDuration,
  normalizeNumber,
  normalizeString,
  parseDurationToNanoseconds,
} from "@/shared/api/adapters/rclone-rc/shared-utils"

describe("shared-utils", () => {
  it("sorts job ids and job records in descending numeric order", () => {
    expect([1, 10, 2].sort(compareJobIdsDesc)).toEqual([10, 2, 1])
    expect(
      [{ id: 3 }, { jobid: 8 }, { jobId: 5 }].sort(compareJobRecordsDesc),
    ).toEqual([{ jobid: 8 }, { jobId: 5 }, { id: 3 }])
  })

  it("normalizes primitive values and durations with sensible fallbacks", () => {
    expect(normalizeString("debug", "NOTICE")).toBe("debug")
    expect(normalizeString(1, "NOTICE")).toBe("NOTICE")
    expect(normalizeNumber(7, 4)).toBe(7)
    expect(normalizeNumber("7", 4)).toBe(4)
    expect(normalizeDuration(" 5m ", "1m")).toBe("5m")
    expect(normalizeDuration(2 * 60 * 1_000_000_000, "1m")).toBe("2m")
    expect(normalizeDuration(123, "1m")).toBe("123ns")
    expect(normalizeDuration(undefined, "1m")).toBe("1m")
  })

  it("parses supported duration units to nanoseconds", () => {
    expect(parseDurationToNanoseconds("1.5s")).toBe(1_500_000_000)
    expect(parseDurationToNanoseconds("2m")).toBe(120_000_000_000)
    expect(parseDurationToNanoseconds("250ms")).toBe(250_000_000)
    expect(() => parseDurationToNanoseconds("12")).toThrow("Invalid duration format")
  })
})
