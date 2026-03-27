import type { ExplorerItem } from "@/shared/api/contracts/explorer"
import {
  formatLocalizedBytes,
  formatLocalizedCompactDateTime,
} from "@/shared/i18n/formatters"

type SortField = "name" | "size" | "modified"

type SortMode =
  | "name-asc"
  | "name-desc"
  | "size-desc"
  | "size-asc"
  | "modified-desc"
  | "modified-asc"

function formatBytes(value?: number, locale?: string) {
  return formatLocalizedBytes(value, locale as "en" | "zh-CN" | undefined)
}

function formatModTime(value?: string, locale?: string) {
  return formatLocalizedCompactDateTime(value, locale as "en" | "zh-CN" | undefined)
}

function nextSortMode(current: SortMode, field: SortField): SortMode {
  if (field === "name") {
    return current === "name-asc" ? "name-desc" : "name-asc"
  }

  if (field === "size") {
    return current === "size-asc" ? "size-desc" : "size-asc"
  }

  return current === "modified-asc" ? "modified-desc" : "modified-asc"
}

function sortLabel(label: string, sortMode: SortMode, field: SortField) {
  const isActive =
    (field === "name" && (sortMode === "name-asc" || sortMode === "name-desc")) ||
    (field === "size" && (sortMode === "size-asc" || sortMode === "size-desc")) ||
    (field === "modified" && (sortMode === "modified-asc" || sortMode === "modified-desc"))

  if (!isActive) {
    return label
  }

  const isAsc =
    sortMode === "name-asc" || sortMode === "size-asc" || sortMode === "modified-asc"

  return `${label} ${isAsc ? "↑" : "↓"}`
}

function filterAndSortExplorerItems(items: ExplorerItem[], filterText: string, sortMode: SortMode) {
  const normalizedFilter = filterText.trim().toLowerCase()

  const filtered = normalizedFilter
    ? items.filter((item) => item.name.toLowerCase().includes(normalizedFilter))
    : [...items]

  filtered.sort((left, right) => {
    if (left.type !== right.type) {
      return left.type === "dir" ? -1 : 1
    }

    if (sortMode === "name-asc") {
      return left.name.localeCompare(right.name)
    }

    if (sortMode === "name-desc") {
      return right.name.localeCompare(left.name)
    }

    if (sortMode === "size-desc") {
      return (right.size ?? -1) - (left.size ?? -1) || left.name.localeCompare(right.name)
    }

    if (sortMode === "size-asc") {
      return (left.size ?? -1) - (right.size ?? -1) || left.name.localeCompare(right.name)
    }

    const leftTime = left.modTime ? Date.parse(left.modTime) : -1
    const rightTime = right.modTime ? Date.parse(right.modTime) : -1

    if (sortMode === "modified-desc") {
      return rightTime - leftTime || left.name.localeCompare(right.name)
    }

    return leftTime - rightTime || left.name.localeCompare(right.name)
  })

  return filtered
}

export type { SortField, SortMode }
export { filterAndSortExplorerItems, formatBytes, formatModTime, nextSortMode, sortLabel }
