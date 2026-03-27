import type { JobApi, JobListResult, RuntimeJob } from "@/shared/api/contracts/jobs"
import type { ApiTransport } from "@/shared/api/transport/api-transport"
import { mapRuntimeJob } from "@/shared/api/adapters/rclone-rc/job-mappers"
import { compareJobIdsDesc, compareJobRecordsDesc } from "@/shared/api/adapters/rclone-rc/shared-utils"
import { RcloneRcStatsApi } from "@/shared/api/adapters/rclone-rc/stats-api"

class RcloneRcJobApi extends RcloneRcStatsApi implements JobApi {
  constructor(private readonly jobTransport: ApiTransport) {
    super(jobTransport)
  }

  async list(): Promise<JobListResult> {
    const MAX_RUNNING_JOBS = 50
    const MAX_FINISHED_JOBS = 100
    const response = await this.jobTransport.request<{
      jobids?: Array<number | string>
      runningIds?: Array<number | string>
      finishedIds?: Array<number | string>
      running?: Array<Record<string, unknown>>
      finished?: Array<Record<string, unknown>>
    }>({
      method: "POST",
      path: "job/list",
      body: {},
    })

    const runningDetails = [...(response.running ?? [])].sort(compareJobRecordsDesc)
    const finishedDetails = [...(response.finished ?? [])].sort(compareJobRecordsDesc)
    const running = runningDetails.slice(0, MAX_RUNNING_JOBS).map(mapRuntimeJob)
    const finished = finishedDetails.slice(0, MAX_FINISHED_JOBS).map(mapRuntimeJob)

    if (running.length === 0 && finished.length === 0) {
      const allIds = [...(response.jobids ?? [])].sort(compareJobIdsDesc)
      const runningIds = [...(response.runningIds ?? [])].sort(compareJobIdsDesc)
      const runningIdSet = new Set(runningIds.map((id) => String(id)))
      const finishedIds = (
        response.finishedIds && response.finishedIds.length > 0
          ? [...response.finishedIds]
          : allIds.filter((id) => !runningIdSet.has(String(id)))
      ).sort(compareJobIdsDesc)

      return {
        running: runningIds.slice(0, MAX_RUNNING_JOBS).map((id) => ({
          id,
          group: `job/${id}`,
          status: "running" as const,
        })),
        finished: finishedIds.slice(0, MAX_FINISHED_JOBS).map((id) => ({
          id,
          group: `job/${id}`,
          status: "unknown" as const,
        })),
        totalRunning: runningIds.length,
        totalFinished: finishedIds.length,
        truncatedRunning: runningIds.length > MAX_RUNNING_JOBS,
        truncatedFinished: finishedIds.length > MAX_FINISHED_JOBS,
      }
    }

    return {
      running,
      finished,
      totalRunning: runningDetails.length,
      totalFinished: finishedDetails.length,
      truncatedRunning: runningDetails.length > MAX_RUNNING_JOBS,
      truncatedFinished: finishedDetails.length > MAX_FINISHED_JOBS,
    }
  }

  async get(jobId: number | string): Promise<RuntimeJob> {
    const response = await this.jobTransport.request<Record<string, unknown>>({
      method: "POST",
      path: "job/status",
      body: { jobid: jobId },
    })

    return mapRuntimeJob({ id: jobId, ...response })
  }

  async stop(jobId: number | string): Promise<void> {
    await this.jobTransport.request({
      method: "POST",
      path: "job/stop",
      body: { jobid: jobId },
    })
  }
}

export { RcloneRcJobApi }
