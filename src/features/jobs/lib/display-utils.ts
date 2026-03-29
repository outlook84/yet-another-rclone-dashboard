import type { RuntimeJob, TransferStats } from "@/shared/api/contracts/jobs"
import {
  formatLocalizedBytes,
  formatLocalizedDateTime,
  formatLocalizedDurationShort,
} from "@/shared/i18n/formatters"

function formatBytes(value?: number, locale?: string) {
  return formatLocalizedBytes(value, locale as "en" | "zh-CN" | undefined)
}

function formatEta(value?: number, locale?: string) {
  return formatLocalizedDurationShort(value, locale as "en" | "zh-CN" | undefined)
}

function formatElapsedTime(value?: number, locale?: string) {
  return formatLocalizedDurationShort(value, locale as "en" | "zh-CN" | undefined)
}

function formatRate(value?: number, locale?: string) {
  const formatted = formatBytes(value, locale)
  return formatted === "-" ? "-" : `${formatted}/s`
}

function formatProgressPercent(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null
  }

  const clamped = Math.min(Math.max(value, 0), 100)
  return {
    numeric: clamped,
    label: `${Math.round(clamped)}%`,
  }
}

function formatJobKind(value?: string) {
  if (!value) return "-"
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function statusTone(status: RuntimeJob["status"]) {
  if (status === "error") return "red"
  if (status === "success") return "green"
  if (status === "stopped") return "yellow"
  return "blue"
}

function formatStatus(status: RuntimeJob["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatJobMessage(message?: string) {
  return message || "No message reported"
}

function formatDateTime(value?: string, locale?: string) {
  return formatLocalizedDateTime(value, locale as "en" | "zh-CN" | undefined)
}

function getCurrentThroughput(stats?: TransferStats) {
  if (!stats?.transferring?.length) {
    return Number.isFinite(stats?.speed) ? (stats?.speed ?? 0) : 0
  }

  const currentSpeed = stats.transferring.reduce((total, item) => {
    const speed = Number.isFinite(item.speedAvg) ? item.speedAvg : Number.isFinite(item.speed) ? item.speed : 0
    return total + (speed ?? 0)
  }, 0)
  return currentSpeed > 0 ? currentSpeed : Number.isFinite(stats.speed) ? (stats.speed ?? 0) : 0
}

export {
  formatBytes,
  formatDateTime,
  formatElapsedTime,
  formatEta,
  formatJobKind,
  formatJobMessage,
  formatProgressPercent,
  formatRate,
  formatStatus,
  getCurrentThroughput,
  statusTone,
}
