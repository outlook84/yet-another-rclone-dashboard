import { describe, expect, it, vi } from "vitest"
import { RcloneRcStatsApi } from "@/shared/api/adapters/rclone-rc/stats-api"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

function createTransport(
  handler: (input: TransportRequest) => Promise<unknown>,
): ApiTransport {
  return {
    request: vi.fn((input: TransportRequest) => handler(input)) as ApiTransport["request"],
  }
}

describe("RcloneRcStatsApi", () => {
  it("falls back when job/batch is unsupported and still returns global stats", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "job/batch") {
        throw { status: 404, error: 'couldn\'t find method "job/batch"' }
      }

      if (input.path === "core/stats" && (input.body as { group?: string } | undefined)?.group === "demo") {
        return { speed: 10, bytes: 20 }
      }

      if (input.path === "core/stats" && (input.body as { group?: string } | undefined)?.group === "global_stats") {
        return { lastError: "global boom", errors: 2 }
      }

      if (input.path === "core/memstats") {
        return { HeapAlloc: 1234 }
      }

      if (input.path === "core/transferred") {
        return {
          transferred: [
            { name: "demo.txt", what: "transferring", error: "" },
          ],
        }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcStatsApi(transport)
    const result = await api.getCombinedStats("demo")

    expect(result.stats.speed).toBe(10)
    expect(result.mem.HeapAlloc).toBe(1234)
    expect(result.transferred[0]?.what).toBe("transferring")
    expect(result.globalStats.lastError).toBe("global boom")

    expect((transport.request as ReturnType<typeof vi.fn>).mock.calls[0]?.[0]?.path).toBe("job/batch")
  })

  it("reuses fallback mode for later batch requests after unsupported detection", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "job/batch") {
        throw { status: 405, error: 'couldn\'t find method "job/batch"' }
      }

      return { path: input.path }
    })

    const api = new RcloneRcStatsApi(transport)

    await expect(api.batch([{ _path: "core/version" }])).resolves.toEqual([{ path: "core/version" }])
    await expect(api.batch([{ _path: "core/stats" }])).resolves.toEqual([{ path: "core/stats" }])

    const calls = (transport.request as ReturnType<typeof vi.fn>).mock.calls.map(([input]) => input.path)
    expect(calls.filter((path) => path === "job/batch")).toHaveLength(1)
    expect(calls).toContain("core/version")
    expect(calls).toContain("core/stats")
  })
})
