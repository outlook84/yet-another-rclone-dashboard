import { describe, expect, it, vi } from "vitest"
import { RcloneRcJobApi } from "@/shared/api/adapters/rclone-rc/job-api"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

function createTransport(
  handler: (input: TransportRequest) => Promise<unknown>,
): ApiTransport {
  return {
    request: vi.fn((input: TransportRequest) => handler(input)) as ApiTransport["request"],
  }
}

describe("RcloneRcJobApi", () => {
  it("maps upstream job/list ids with truncation flags", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "job/list") {
        return {
          jobids: Array.from({ length: 160 }, (_, index) => index + 1),
          runningIds: Array.from({ length: 55 }, (_, index) => index + 1),
          finishedIds: Array.from({ length: 105 }, (_, index) => 200 + index),
        }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcJobApi(transport)
    const result = await api.list()

    expect(result.running).toHaveLength(50)
    expect(result.finished).toHaveLength(100)
    expect(result.running[0]).toMatchObject({ id: 55, status: "running" })
    expect(result.finished[0]).toMatchObject({ id: 304, status: "unknown" })
    expect(result).toMatchObject({
      totalRunning: 55,
      totalFinished: 105,
      truncatedRunning: true,
      truncatedFinished: true,
    })
  })

  it("falls back to id-only job summaries when details are unavailable", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "job/list") {
        return {
          jobids: [1, 2, 3, 4],
          runningIds: [4, 2],
        }
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcJobApi(transport)

    await expect(api.list()).resolves.toEqual({
      running: [
        { id: 4, group: "job/4", status: "running" },
        { id: 2, group: "job/2", status: "running" },
      ],
      finished: [
        { id: 3, group: "job/3", status: "unknown" },
        { id: 1, group: "job/1", status: "unknown" },
      ],
      totalRunning: 2,
      totalFinished: 2,
      truncatedRunning: false,
      truncatedFinished: false,
    })
  })

  it("gets and stops a job using the expected endpoints", async () => {
    const transport = createTransport(async (input) => {
      if (input.path === "job/status") {
        expect(input.body).toEqual({ jobid: "job-7" })
        return {
          finished: true,
          error: "failed",
          endTime: "2026-03-28T10:00:00.000Z",
        }
      }

      if (input.path === "job/stop") {
        expect(input.body).toEqual({ jobid: "job-7" })
        return {}
      }

      throw new Error(`unexpected path: ${input.path}`)
    })

    const api = new RcloneRcJobApi(transport)

    await expect(api.get("job-7")).resolves.toEqual({
      id: "job-7",
      group: undefined,
      kind: undefined,
      status: "error",
      message: "failed",
      duration: undefined,
      startedAt: undefined,
      endedAt: "2026-03-28T10:00:00.000Z",
    })

    await expect(api.stop("job-7")).resolves.toBeUndefined()
  })
})
