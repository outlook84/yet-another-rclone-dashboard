import type { AppLocale } from "@/shared/i18n/locale-store"

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isPlaceholderText(value?: string) {
  if (!value) {
    return true
  }

  const normalized = value.trim().toLowerCase()
  return normalized === "" || normalized === "undefined" || normalized === "null" || normalized === "nan"
}

function hasBackendText(value?: string): value is string {
  return !isPlaceholderText(value)
}

function formatBackendText(value?: string, fallback = "-") {
  return hasBackendText(value) ? value.trim() : fallback
}

function formatLocalizedNumber(value?: number, locale?: AppLocale) {
  if (!isFiniteNumber(value)) {
    return "-"
  }

  return new Intl.NumberFormat(locale).format(value)
}

function formatLocalizedBytes(value?: number, locale?: AppLocale) {
  if (!isFiniteNumber(value) || value < 0) {
    return "-"
  }

  if (value === 0) {
    return "0 B"
  }

  const units = ["B", "KB", "MB", "GB", "TB", "PB"]
  const exponent = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1)
  const normalized = value / 1024 ** exponent
  const precision = normalized >= 10 || exponent === 0 ? 0 : 1

  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(normalized)} ${units[exponent]}`
}

function formatLocalizedDurationShort(value?: number, locale?: AppLocale) {
  if (!isFiniteNumber(value) || value < 0) {
    return "-"
  }

  const totalSeconds = Math.floor(value)
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (locale === "zh-CN") {
    if (days > 0) return `${days}天 ${hours}时 ${minutes}分`
    if (hours > 0) return `${hours}时 ${minutes}分`
    if (minutes > 0) return `${minutes}分 ${seconds}秒`
    return `${seconds}秒`
  }

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function formatLocalizedDateTime(value?: string, locale?: AppLocale) {
  if (typeof value !== "string" || isPlaceholderText(value)) {
    return "-"
  }

  const safeValue = value.trim()
  const date = new Date(safeValue)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date)
}

function formatLocalizedCompactDateTime(value?: string, locale?: AppLocale) {
  if (typeof value !== "string" || isPlaceholderText(value)) {
    return "-"
  }

  const safeValue = value.trim()
  const date = new Date(safeValue)
  if (Number.isNaN(date.getTime())) {
    return "-"
  }

  void locale
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")

  return `${year}/${month}/${day} ${hour}:${minute}`
}

export {
  formatBackendText,
  formatLocalizedBytes,
  formatLocalizedCompactDateTime,
  formatLocalizedDateTime,
  formatLocalizedDurationShort,
  formatLocalizedNumber,
  hasBackendText,
}
