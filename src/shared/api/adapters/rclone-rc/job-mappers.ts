import type { RuntimeJob } from "@/shared/api/contracts/jobs"

function mapRuntimeJob(input: Record<string, unknown>): RuntimeJob {
  return {
    id: (input.id ?? input.jobid ?? input.jobId ?? "unknown") as string | number,
    group: typeof input.group === "string" ? input.group : undefined,
    kind: typeof input.kind === "string" ? input.kind : undefined,
    status: input.finished
      ? input.error
        ? "error"
        : "success"
      : "running",
    message: typeof input.error === "string" ? input.error : undefined,
    duration: typeof input.duration === "number" ? input.duration : undefined,
    startedAt: typeof input.startTime === "string" ? input.startTime : undefined,
    endedAt: typeof input.endTime === "string" ? input.endTime : undefined,
  }
}

export { mapRuntimeJob }
