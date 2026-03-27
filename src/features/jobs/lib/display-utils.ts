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
    return stats?.speed ?? 0
  }

  const currentSpeed = stats.transferring.reduce((total, item) => total + (item.speedAvg ?? item.speed ?? 0), 0)
  return currentSpeed > 0 ? currentSpeed : stats.speed ?? 0
}

export { formatBytes, formatDateTime, formatElapsedTime, formatEta, formatJobKind, formatJobMessage, formatStatus, getCurrentThroughput, statusTone }
