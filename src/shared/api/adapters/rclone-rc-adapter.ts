import type { AppCapabilities } from "@/shared/api/contracts/app"
import type { ExplorerApi } from "@/shared/api/contracts/explorer"
import type { JobApi } from "@/shared/api/contracts/jobs"
import type { MountApi } from "@/shared/api/contracts/mounts"
import type { RemoteApi } from "@/shared/api/contracts/remotes"
import type { SessionApi } from "@/shared/api/contracts/session"
import type { RuntimeSettingsApi } from "@/shared/api/contracts/settings"
import type { BackendAdapter } from "@/shared/api/adapters/backend-adapter"
import { DisabledMountApi } from "@/shared/api/adapters/rclone-rc/disabled-mount-api"
import { RcloneRcExplorerApi } from "@/shared/api/adapters/rclone-rc/explorer-api"
import { RcloneRcJobApi } from "@/shared/api/adapters/rclone-rc/job-api"
import { RcloneRcRemoteApi } from "@/shared/api/adapters/rclone-rc/remote-api"
import { RcloneRcRuntimeSettingsApi } from "@/shared/api/adapters/rclone-rc/runtime-settings-api"
import { RcloneRcSessionApi } from "@/shared/api/adapters/rclone-rc/session-api"
import type { ApiTransport } from "@/shared/api/transport/api-transport"

class RcloneRcAdapter implements BackendAdapter {
  readonly session: SessionApi
  readonly remotes: RemoteApi
  readonly explorer: ExplorerApi
  readonly jobs: JobApi
  readonly mounts: MountApi
  readonly settings: RuntimeSettingsApi

  constructor(transport: ApiTransport, baseUrl: string) {
    this.session = new RcloneRcSessionApi(transport, baseUrl)
    this.remotes = new RcloneRcRemoteApi(transport)
    this.explorer = new RcloneRcExplorerApi(transport)
    this.jobs = new RcloneRcJobApi(transport)
    this.mounts = new DisabledMountApi()
    this.settings = new RcloneRcRuntimeSettingsApi(transport)
  }

  async capabilities(): Promise<AppCapabilities> {
    return {
      authModes: ["basic", "none"],
      supportsRemotes: true,
      supportsExplorer: true,
      supportsMounts: false,
      supportsRuntimeJobs: true,
      supportsRuntimeSettings: true,
      supportsSchedules: false,
      supportsPublicLink: true,
      supportsConfigMutation: true,
    }
  }
}

export { RcloneRcAdapter }
