import type { AppCapabilities } from "@/shared/api/contracts/app"
import type { ExplorerApi } from "@/shared/api/contracts/explorer"
import type { JobApi, ScheduleApi } from "@/shared/api/contracts/jobs"
import type { MountApi } from "@/shared/api/contracts/mounts"
import type { RemoteApi } from "@/shared/api/contracts/remotes"
import type { SessionApi } from "@/shared/api/contracts/session"
import type { RuntimeSettingsApi } from "@/shared/api/contracts/settings"

export interface BackendAdapter {
  session: SessionApi
  remotes: RemoteApi
  explorer: ExplorerApi
  jobs: JobApi
  mounts: MountApi
  settings: RuntimeSettingsApi
  schedules?: ScheduleApi
  capabilities(): Promise<AppCapabilities>
}
