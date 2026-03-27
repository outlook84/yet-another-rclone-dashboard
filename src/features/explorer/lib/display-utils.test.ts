import { describe, expect, it } from "vitest"
import {
  filterAndSortExplorerItems,
  formatBytes,
  formatModTime,
  nextSortMode,
  sortLabel,
} from "@/features/explorer/lib/display-utils"
import { formatLocalizedCompactDateTime } from "@/shared/i18n/formatters"

describe("display-utils", () => {
  it("formats bytes and timestamps for explorer display", () => {
    expect(formatBytes(1536)).toBe("1.5 KB")
    expect(formatModTime("2026-03-22T00:00:00Z")).toBe(
      formatLocalizedCompactDateTime("2026-03-22T00:00:00Z", "en"),
    )
  })

  it("toggles sort modes and labels", () => {
    expect(nextSortMode("name-asc", "name")).toBe("name-desc")
    expect(sortLabel("Name", "name-desc", "name")).toBe("Name ↓")
    expect(sortLabel("Size", "name-desc", "size")).toBe("Size")
  })

  it("filters by name and keeps directories ahead of files", () => {
    const result = filterAndSortExplorerItems(
      [
        { name: "zeta.log", path: "zeta.log", type: "file", size: 99 },
        { name: "alpha", path: "alpha", type: "dir" },
        { name: "file.txt", path: "file.txt", type: "file", size: 123 },
      ],
      "",
      "name-desc",
    )

    expect(result.map((item) => item.name)).toEqual(["alpha", "zeta.log", "file.txt"])
    expect(filterAndSortExplorerItems(result, "zeta", "name-desc").map((item) => item.name)).toEqual([
      "zeta.log",
    ])
  })
})
