import type { RuntimeSettings, RuntimeSettingsApi } from "@/shared/api/contracts/settings"
import type { ApiTransport } from "@/shared/api/transport/api-transport"
import {
  normalizeDuration,
  normalizeNumber,
  normalizeString,
  parseDurationToNanoseconds,
} from "@/shared/api/adapters/rclone-rc/shared-utils"

class RcloneRcRuntimeSettingsApi implements RuntimeSettingsApi {
  constructor(private readonly transport: ApiTransport) {}

  async get(): Promise<RuntimeSettings> {
    const [optionsResponse, bandwidthResponse] = await Promise.all([
      this.transport.request<{ main?: Record<string, unknown> }>({
        method: "POST",
        path: "options/get",
        body: { blocks: "main" },
      }),
      this.transport.request<{ rate?: string }>({
        method: "POST",
        path: "core/bwlimit",
        body: {},
      }),
    ])

    const main = optionsResponse.main ?? {}

    return {
      logLevel: normalizeString(main.LogLevel, "NOTICE"),
      bandwidthLimit: normalizeString(bandwidthResponse.rate, "off"),
      transfers: normalizeNumber(main.Transfers, 4),
      checkers: normalizeNumber(main.Checkers, 8),
      timeout: normalizeDuration(main.Timeout, "5m"),
      connectTimeout: normalizeDuration(main.ConnectTimeout, "1m"),
      retries: normalizeNumber(main.Retries, 3),
      lowLevelRetries: normalizeNumber(main.LowLevelRetries, 10),
    }
  }

  async update(input: Partial<RuntimeSettings>): Promise<void> {
    const mainPatch: Record<string, unknown> = {}

    if (input.logLevel !== undefined) {
      mainPatch.LogLevel = input.logLevel
    }
    if (input.transfers !== undefined) {
      mainPatch.Transfers = input.transfers
    }
    if (input.checkers !== undefined) {
      mainPatch.Checkers = input.checkers
    }
    if (input.timeout !== undefined) {
      mainPatch.Timeout = parseDurationToNanoseconds(input.timeout)
    }
    if (input.connectTimeout !== undefined) {
      mainPatch.ConnectTimeout = parseDurationToNanoseconds(input.connectTimeout)
    }
    if (input.retries !== undefined) {
      mainPatch.Retries = input.retries
    }
    if (input.lowLevelRetries !== undefined) {
      mainPatch.LowLevelRetries = input.lowLevelRetries
    }

    if (Object.keys(mainPatch).length > 0) {
      await this.transport.request({
        method: "POST",
        path: "options/set",
        body: {
          main: mainPatch,
        },
      })
    }

    if (input.bandwidthLimit !== undefined) {
      await this.transport.request({
        method: "POST",
        path: "core/bwlimit",
        body: {
          rate: input.bandwidthLimit,
        },
      })
    }
  }
}

export { RcloneRcRuntimeSettingsApi }
