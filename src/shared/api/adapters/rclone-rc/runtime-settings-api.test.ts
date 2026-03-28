import { describe, expect, it, vi } from "vitest"
import { RcloneRcRuntimeSettingsApi } from "@/shared/api/adapters/rclone-rc/runtime-settings-api"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

function createTransport(
  handler: (input: TransportRequest) => Promise<unknown>,
): ApiTransport {
  return {
    request: vi.fn((input: TransportRequest) => handler(input)) as ApiTransport["request"],
  }
}

describe("RcloneRcRuntimeSettingsApi", () => {
  it("maps missing runtime settings to defaults", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "options/get") {
        return {
          main: {
            LogLevel: "DEBUG",
            Transfers: 9,
            Timeout: 2 * 60 * 1_000_000_000,
          },
        }
      }

      if (input.path === "core/bwlimit") {
        return {}
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcRuntimeSettingsApi(transport)

    await expect(api.get()).resolves.toEqual({
      logLevel: "DEBUG",
      bandwidthLimit: "off",
      transfers: 9,
      checkers: 8,
      timeout: "2m",
      connectTimeout: "1m",
      retries: 3,
      lowLevelRetries: 10,
    })
  })

  it("sends only the requested patches when updating settings", async () => {
    const transport = createTransport(async () => ({}))
    const api = new RcloneRcRuntimeSettingsApi(transport)

    await api.update({
      logLevel: "INFO",
      timeout: "1.5s",
      connectTimeout: "250ms",
      bandwidthLimit: "10M",
    })

    const calls = (transport.request as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => input)
    expect(calls).toHaveLength(2)
    expect(calls[0]).toMatchObject({
      path: "options/set",
      body: {
        main: {
          LogLevel: "INFO",
          Timeout: 1_500_000_000,
          ConnectTimeout: 250_000_000,
        },
      },
    })
    expect(calls[1]).toMatchObject({
      path: "core/bwlimit",
      body: {
        rate: "10M",
      },
    })
  })

  it("skips network calls when update input is empty", async () => {
    const transport = createTransport(async () => ({}))
    const api = new RcloneRcRuntimeSettingsApi(transport)

    await api.update({})

    expect(transport.request).not.toHaveBeenCalled()
  })
})
