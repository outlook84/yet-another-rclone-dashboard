export interface JobProgress {
  bytes?: number
  totalBytes?: number
  speed?: number
  percentage?: number
}

export interface RuntimeJob {
  id: number | string
  group?: string
  kind?: string
  status: "running" | "success" | "error" | "stopped" | "unknown"
  message?: string
  progress?: JobProgress
  duration?: number
  startedAt?: string
  endedAt?: string
}

export interface JobListResult {
  running: RuntimeJob[]
  finished: RuntimeJob[]
  totalRunning?: number
  totalFinished?: number
  truncatedRunning?: boolean
  truncatedFinished?: boolean
}

export interface TransferStats {
  speed?: number
  bytes?: number
  checks?: number
  transfers?: number
  errors?: number
  deletes?: number
  eta?: number
  elapsedTime?: number
  lastError?: string
  transferring?: TransferItem[]
}

export interface TransferItem {
  name?: string
  group?: string
  srcFs?: string
  dstFs?: string
  bytes?: number
  size?: number
  speed?: number
  speedAvg?: number
  eta?: number
  percentage?: number
}

export interface PastTransferItem {
  name?: string
  size?: number
  bytes?: number
  checked?: boolean
  what?: string
  startedAt?: string
  completedAt?: string
  error?: string
  group?: string
  srcFs?: string
  dstFs?: string
}

export interface CombinedStatsResult {
  stats: TransferStats
  mem: MemStats
  transferred: PastTransferItem[]
  globalStats: TransferStats
}

export interface RcBatchInput {
  _path: string
  [key: string]: unknown
}

export type RcBatchResult = Record<string, unknown>

export interface ScheduledTask {
  id: string
  name: string
  enabled: boolean
  schedule: string
}

export interface CreateScheduledTaskInput {
  name: string
  schedule: string
}

export interface UpdateScheduledTaskInput {
  name?: string
  enabled?: boolean
  schedule?: string
}

import { MemStats } from "./session"

export interface JobApi {
  list(): Promise<JobListResult>
  get(jobId: number | string): Promise<RuntimeJob>
  stop(jobId: number | string): Promise<void>
  stopGroup(group: string): Promise<void>
  getStats(group?: string): Promise<TransferStats>
  getTransferred(group?: string): Promise<PastTransferItem[]>
  resetStats(group?: string): Promise<void>
  getCombinedStats(group?: string): Promise<CombinedStatsResult>
  batch(inputs: RcBatchInput[]): Promise<RcBatchResult[]>
}

export interface ScheduleApi {
  list(): Promise<ScheduledTask[]>
  get(id: string): Promise<ScheduledTask>
  create(input: CreateScheduledTaskInput): Promise<ScheduledTask>
  update(id: string, input: UpdateScheduledTaskInput): Promise<ScheduledTask>
  delete(id: string): Promise<void>
  runNow(id: string): Promise<void>
}
