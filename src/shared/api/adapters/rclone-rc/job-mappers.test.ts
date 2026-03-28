import { describe, expect, it } from "vitest"
import { mapRuntimeJob } from "@/shared/api/adapters/rclone-rc/job-mappers"

describe("mapRuntimeJob", () => {
  it("maps a running job with optional metadata", () => {
    expect(
      mapRuntimeJob({
        id: 42,
        group: "sync-group",
        kind: "sync",
        finished: false,
        duration: 1200,
        startTime: "2026-03-28T08:00:00.000Z",
      }),
    ).toEqual({
      id: 42,
      group: "sync-group",
      kind: "sync",
      status: "running",
      message: undefined,
      duration: 1200,
      startedAt: "2026-03-28T08:00:00.000Z",
      endedAt: undefined,
    })
  })

  it("maps finished jobs to success or error and accepts alternate id fields", () => {
    expect(
      mapRuntimeJob({
        jobid: "job-1",
        finished: true,
        endTime: "2026-03-28T08:30:00.000Z",
      }),
    ).toEqual({
      id: "job-1",
      group: undefined,
      kind: undefined,
      status: "success",
      message: undefined,
      duration: undefined,
      startedAt: undefined,
      endedAt: "2026-03-28T08:30:00.000Z",
    })

    expect(
      mapRuntimeJob({
        jobId: "job-2",
        finished: true,
        error: "copy failed",
      }),
    ).toEqual({
      id: "job-2",
      group: undefined,
      kind: undefined,
      status: "error",
      message: "copy failed",
      duration: undefined,
      startedAt: undefined,
      endedAt: undefined,
    })
  })

  it("falls back to an unknown id when none is provided", () => {
    expect(
      mapRuntimeJob({
        finished: false,
      }),
    ).toMatchObject({
      id: "unknown",
      status: "running",
    })
  })
})
