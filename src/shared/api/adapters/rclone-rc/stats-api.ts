import type {
  CombinedStatsResult,
  JobApi,
  PastTransferItem,
  RcBatchInput,
  RcBatchResult,
  TransferStats,
} from "@/shared/api/contracts/jobs"
import type { MemStats } from "@/shared/api/contracts/session"
import type { ApiTransport } from "@/shared/api/transport/api-transport"

class RcloneRcStatsApi implements Pick<JobApi, "getStats" | "getTransferred" | "resetStats" | "getCombinedStats" | "batch"> {
  private supportsBatch: boolean | null = null

  constructor(private readonly transport: ApiTransport) {}

  async getStats(group?: string): Promise<TransferStats> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "core/stats",
      body: group ? { group } : {},
    })

    return mapTransferStats(response)
  }

  async getTransferred(group?: string): Promise<PastTransferItem[]> {
    const response = await this.transport.request<{ transferred?: Array<Record<string, unknown>> }>({
      method: "POST",
      path: "core/transferred",
      body: group ? { group } : {},
    })

    return (response.transferred ?? []).map((item) => mapTransferredItem(item))
  }

  async resetStats(group?: string): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "core/stats-reset",
      body: group ? { group } : {},
    })
  }

  async getCombinedStats(group?: string): Promise<CombinedStatsResult> {
    if (this.supportsBatch === false) {
      return this.getCombinedStatsFallback(group)
    }

    try {
      const response = await this.transport.request<{ results?: Array<Record<string, unknown>> }>({
        method: "POST",
        path: "job/batch",
        body: {
          inputs: [
            { _path: "core/stats", ...(group ? { group } : {}) },
            { _path: "core/memstats" },
            { _path: "core/transferred", ...(group ? { group } : {}) },
            { _path: "core/stats", group: "global_stats" },
          ],
        },
      })

      const results = response.results ?? []
      const statsRaw = (results[0] as Record<string, unknown>) ?? {}
      const memRaw = (results[1] as Record<string, unknown>) ?? {}
      const transferredRaw = (results[2] as { transferred?: Array<Record<string, unknown>> } | undefined) ?? {}
      const globalStatsRaw = (results[3] as Record<string, unknown>) ?? {}

      this.supportsBatch = true

      return {
        stats: mapTransferStats(statsRaw),
        mem: memRaw as unknown as MemStats,
        transferred: (transferredRaw.transferred ?? []).map((item) => mapTransferredItem(item)),
        globalStats: mapTransferStats(globalStatsRaw),
      }
    } catch (error) {
      if (this.isBatchUnsupportedError(error)) {
        this.supportsBatch = false
        return this.getCombinedStatsFallback(group)
      }
      throw error
    }
  }

  async batch(inputs: RcBatchInput[]): Promise<RcBatchResult[]> {
    if (this.supportsBatch === false) {
      return this.batchFallback(inputs)
    }

    try {
      const response = await this.transport.request<{ results?: RcBatchResult[] }>({
        method: "POST",
        path: "job/batch",
        body: { inputs },
      })

      this.supportsBatch = true
      return response.results ?? []
    } catch (error) {
      if (this.isBatchUnsupportedError(error)) {
        this.supportsBatch = false
        return this.batchFallback(inputs)
      }
      throw error
    }
  }

  private async getCombinedStatsFallback(group?: string): Promise<CombinedStatsResult> {
    const [stats, mem, transferred, globalStats] = await Promise.all([
      this.getStats(group),
      this.getMemStats(),
      this.getTransferred(group),
      this.getStats("global_stats"),
    ])
    return { stats, mem, transferred, globalStats }
  }

  private async getMemStats(): Promise<MemStats> {
    return this.transport.request<MemStats>({
      method: "POST",
      path: "core/memstats",
      body: {},
    })
  }

  private isBatchUnsupportedError(error: unknown): boolean {
    if (error && typeof error === "object") {
      const err = error as Record<string, unknown>

      if (
        err.error === 'couldn\'t find method "job/batch"' ||
        err.status === 404 ||
        err.status === 405
      ) {
        return true
      }

      const cause = err.cause
      const causeRecord = cause && typeof cause === "object" ? (cause as Record<string, unknown>) : undefined
      if (
        (causeRecord && causeRecord.error === 'couldn\'t find method "job/batch"') ||
        err.status === 404 ||
        err.status === 405
      ) {
        return true
      }
    }
    return false
  }

  private async batchFallback(inputs: RcBatchInput[]): Promise<RcBatchResult[]> {
    return Promise.all(
      inputs.map(async (input) => {
        const { _path, ...body } = input
        try {
          return await this.transport.request<RcBatchResult>({
            method: "POST",
            path: _path,
            body,
          })
        } catch (error) {
          if (error && typeof error === "object") {
            return error as RcBatchResult
          }
          return { error: error instanceof Error ? error.message : "Unknown error", status: 500 }
        }
      }),
    )
  }
}

function mapTransferStats(response: Record<string, unknown>): TransferStats {
  return {
    speed: typeof response.speed === "number" ? response.speed : undefined,
    bytes: typeof response.bytes === "number" ? response.bytes : undefined,
    checks: typeof response.checks === "number" ? response.checks : undefined,
    transfers: typeof response.transfers === "number" ? response.transfers : undefined,
    errors: typeof response.errors === "number" ? response.errors : undefined,
    deletes: typeof response.deletes === "number" ? response.deletes : undefined,
    eta: typeof response.eta === "number" ? response.eta : undefined,
    elapsedTime: typeof response.elapsedTime === "number" ? response.elapsedTime : undefined,
    lastError: typeof response.lastError === "string" ? response.lastError : undefined,
    transferring: Array.isArray(response.transferring)
      ? response.transferring.map((item) => {
          const entry = item as Record<string, unknown>

          return {
            name: typeof entry.name === "string" ? entry.name : undefined,
            group: typeof entry.group === "string" ? entry.group : undefined,
            srcFs: typeof entry.srcFs === "string" ? entry.srcFs : undefined,
            dstFs: typeof entry.dstFs === "string" ? entry.dstFs : undefined,
            bytes: typeof entry.bytes === "number" ? entry.bytes : undefined,
            size: typeof entry.size === "number" ? entry.size : undefined,
            speed: typeof entry.speed === "number" ? entry.speed : undefined,
            speedAvg: typeof entry.speedAvg === "number" ? entry.speedAvg : undefined,
            eta: typeof entry.eta === "number" ? entry.eta : undefined,
            percentage: typeof entry.percentage === "number" ? entry.percentage : undefined,
          }
        })
      : undefined,
  }
}

function mapTransferredItem(item: Record<string, unknown>): PastTransferItem {
  const entry = item as Record<string, unknown>

  return {
    name: typeof entry.name === "string" ? entry.name : undefined,
    size: typeof entry.size === "number" ? entry.size : undefined,
    bytes: typeof entry.bytes === "number" ? entry.bytes : undefined,
    checked: typeof entry.checked === "boolean" ? entry.checked : undefined,
    what: typeof entry.what === "string" ? entry.what : undefined,
    startedAt:
      typeof entry.started_at === "string"
        ? entry.started_at
        : typeof entry.startedAt === "string"
          ? entry.startedAt
          : undefined,
    completedAt:
      typeof entry.completed_at === "string"
        ? entry.completed_at
        : typeof entry.completedAt === "string"
          ? entry.completedAt
          : undefined,
    error: typeof entry.error === "string" ? entry.error : undefined,
    group: typeof entry.group === "string" ? entry.group : undefined,
    srcFs: typeof entry.srcFs === "string" ? entry.srcFs : undefined,
    dstFs: typeof entry.dstFs === "string" ? entry.dstFs : undefined,
  }
}

export { RcloneRcStatsApi }
