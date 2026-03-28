import { beforeEach, describe, expect, it, vi } from "vitest"
import { RcloneRcSessionApi } from "@/shared/api/adapters/rclone-rc/session-api"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

function createTransport(
  handler: (input: TransportRequest) => Promise<unknown>,
): ApiTransport {
  return {
    request: vi.fn((input: TransportRequest) => handler(input)) as ApiTransport["request"],
  }
}

describe("RcloneRcSessionApi", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("reports ping latency and calls the noop auth endpoint", async () => {
    vi.spyOn(performance, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(145)

    const transport = createTransport(async (input) => {
      if (input.path === "rc/noopauth") {
        return {}
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcSessionApi(transport, "http://localhost:5572")

    await expect(api.ping()).resolves.toEqual({
      ok: true,
      latencyMs: 45,
    })
  })

  it("maps server info using the configured base url", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "core/version") {
        return { version: "1.69.0" }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcSessionApi(transport, "https://demo.example.com/rc")

    await expect(api.getServerInfo()).resolves.toEqual({
      product: "rclone",
      version: "1.69.0",
      apiBaseUrl: "https://demo.example.com/rc",
    })
  })

  it("returns memory stats as-is", async () => {
    const memStats = {
      Alloc: 1,
      TotalAlloc: 2,
      Sys: 3,
      Mallocs: 4,
      Frees: 5,
      HeapAlloc: 6,
      HeapSys: 7,
      HeapIdle: 8,
      HeapInuse: 9,
      HeapReleased: 10,
      HeapObjects: 11,
      StackInuse: 12,
      StackSys: 13,
      MSpanInuse: 14,
      MSpanSys: 15,
      MCacheInuse: 16,
      MCacheSys: 17,
      BuckHashSys: 18,
      GCSys: 19,
      OtherSys: 20,
    }

    const transport = createTransport(async (input) => {
      if (input.path === "core/memstats") {
        return memStats
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcSessionApi(transport, "http://localhost:5572")

    await expect(api.getMemStats()).resolves.toEqual(memStats)
  })
})
