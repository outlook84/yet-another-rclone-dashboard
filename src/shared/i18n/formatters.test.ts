import { describe, expect, it } from "vitest"
import {
  formatBackendText,
  formatLocalizedBytes,
  formatLocalizedCompactDateTime,
  formatLocalizedDateTime,
  formatLocalizedDurationShort,
  formatLocalizedNumber,
  hasBackendText,
} from "@/shared/i18n/formatters"

describe("formatters", () => {
  it("formats numbers and bytes with localized fallbacks", () => {
    expect(formatLocalizedNumber(undefined, "en")).toBe("-")
    expect(formatLocalizedNumber(Number.POSITIVE_INFINITY, "en")).toBe("-")
    expect(formatLocalizedNumber(12345, "en")).toBe("12,345")
    expect(formatLocalizedBytes(0, "en")).toBe("0 B")
    expect(formatLocalizedBytes(1536, "en")).toBe("1.5 KB")
    expect(formatLocalizedBytes(undefined, "zh-CN")).toBe("-")
    expect(formatLocalizedBytes(Number.NaN, "zh-CN")).toBe("-")
  })

  it("formats short durations for english and chinese locales", () => {
    expect(formatLocalizedDurationShort(65, "en")).toBe("1m 5s")
    expect(formatLocalizedDurationShort(3661, "en")).toBe("1h 1m")
    expect(formatLocalizedDurationShort(65, "zh-CN")).toBe("1分 5秒")
    expect(formatLocalizedDurationShort(-1, "zh-CN")).toBe("-")
  })

  it("formats date values and falls back for invalid input", () => {
    const isoValue = "2026-03-28T09:15:30.000Z"
    expect(formatLocalizedDateTime(undefined, "en")).toBe("-")
    expect(formatLocalizedDateTime("not-a-date", "en")).toBe("-")
    expect(formatLocalizedDateTime("undefined", "en")).toBe("-")
    expect(formatLocalizedDateTime(isoValue, "en")).toContain("2026")
    expect(formatLocalizedCompactDateTime(isoValue, "en")).toMatch(/2026\/\d{2}\/\d{2} \d{2}:\d{2}/)
    expect(formatLocalizedCompactDateTime(undefined, "zh-CN")).toBe("-")
  })

  it("normalizes backend placeholder text values without affecting caller-owned strings", () => {
    expect(formatBackendText(" undefined ")).toBe("-")
    expect(formatBackendText(" real text ")).toBe("real text")
    expect(formatBackendText(undefined, "Unknown")).toBe("Unknown")
    expect(hasBackendText(" null ")).toBe(false)
    expect(hasBackendText("ok")).toBe(true)
    expect(" report.txt ".trim()).toBe("report.txt")
  })
})
