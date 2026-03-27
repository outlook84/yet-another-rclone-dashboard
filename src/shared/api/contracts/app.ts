import type { ScheduleApi, JobApi } from "@/shared/api/contracts/jobs"
import type { MountApi } from "@/shared/api/contracts/mounts"
import type { RemoteApi } from "@/shared/api/contracts/remotes"
import type { SessionApi } from "@/shared/api/contracts/session"
import type { ExplorerApi } from "@/shared/api/contracts/explorer"
import type { AuthMode } from "@/shared/api/contracts/auth"
import type { RuntimeSettingsApi } from "@/shared/api/contracts/settings"

export interface AppCapabilities {
  authModes: AuthMode[]
  supportsRemotes: boolean
  supportsExplorer: boolean
  supportsMounts: boolean
  supportsRuntimeJobs: boolean
  supportsRuntimeSettings: boolean
  supportsSchedules: boolean
  supportsPublicLink: boolean
  supportsConfigMutation: boolean
}

export interface AppApiClient {
  session: SessionApi
  remotes: RemoteApi
  explorer: ExplorerApi
  jobs: JobApi
  mounts: MountApi
  settings: RuntimeSettingsApi
  schedules?: ScheduleApi
  capabilities(): Promise<AppCapabilities>
}
