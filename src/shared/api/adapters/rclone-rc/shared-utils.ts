function compareJobIdsDesc(a: string | number, b: string | number) {
  return Number(b) - Number(a)
}

function compareJobRecordsDesc(a: Record<string, unknown>, b: Record<string, unknown>) {
  return compareJobIdsDesc(
    (a.id ?? a.jobid ?? a.jobId ?? 0) as string | number,
    (b.id ?? b.jobid ?? b.jobId ?? 0) as string | number,
  )
}

function normalizeString(value: unknown, fallback: string) {
  return typeof value === "string" ? value : fallback
}

function normalizeNumber(value: unknown, fallback: number) {
  return typeof value === "number" ? value : fallback
}

function formatDurationFromNanoseconds(value: number): string {
  if (!Number.isFinite(value) || value <= 0) {
    return "0s"
  }

  const units = [
    { label: "h", size: 60 * 60 * 1_000_000_000 },
    { label: "m", size: 60 * 1_000_000_000 },
    { label: "s", size: 1_000_000_000 },
    { label: "ms", size: 1_000_000 },
  ]

  for (const unit of units) {
    if (value >= unit.size && value % unit.size === 0) {
      return `${value / unit.size}${unit.label}`
    }
  }

  return `${value}ns`
}

function normalizeDuration(value: unknown, fallback: string): string {
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (trimmed.length > 0) {
      return trimmed
    }
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return formatDurationFromNanoseconds(value)
  }

  return fallback
}

function parseDurationToNanoseconds(value: string): number {
  const normalized = value.trim().toLowerCase()
  const match = normalized.match(/^(\d+(?:\.\d+)?)(ms|s|m|h)$/)

  if (!match) {
    throw new Error(`Invalid duration format: ${value}`)
  }

  const amount = Number(match[1])
  const unit = match[2]
  const multiplier =
    unit === "h"
      ? 60 * 60 * 1_000_000_000
      : unit === "m"
        ? 60 * 1_000_000_000
        : unit === "s"
          ? 1_000_000_000
          : 1_000_000

  return Math.round(amount * multiplier)
}

export {
  compareJobIdsDesc,
  compareJobRecordsDesc,
  normalizeString,
  normalizeNumber,
  normalizeDuration,
  parseDurationToNanoseconds,
}
