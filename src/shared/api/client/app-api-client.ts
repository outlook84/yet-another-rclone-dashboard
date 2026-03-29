import type { AppApiClient, AppCapabilities } from "@/shared/api/contracts/app"
import type { AuthMode, BasicCredentials } from "@/shared/api/contracts/auth"
import { DisabledMountApi } from "@/shared/api/adapters/rclone-rc/disabled-mount-api"
import { RcloneRcJobApi } from "@/shared/api/adapters/rclone-rc/job-api"
import { RcloneRcSessionApi } from "@/shared/api/adapters/rclone-rc/session-api"
import { createAuthStrategy } from "@/shared/api/transport/auth-injector"
import type { BackendAdapter } from "@/shared/api/adapters/backend-adapter"
import type { ExplorerApi } from "@/shared/api/contracts/explorer"
import type { MountApi } from "@/shared/api/contracts/mounts"
import type { RemoteApi } from "@/shared/api/contracts/remotes"
import type { RuntimeSettingsApi } from "@/shared/api/contracts/settings"
import { FetchTransport } from "@/shared/api/transport/fetch-transport"

function createAppApiClient(adapter: BackendAdapter): AppApiClient {
  return {
    session: adapter.session,
    remotes: adapter.remotes,
    explorer: adapter.explorer,
    jobs: adapter.jobs,
    mounts: adapter.mounts,
    settings: adapter.settings,
    schedules: adapter.schedules,
    capabilities: () => adapter.capabilities(),
  }
}

interface RcloneRcClientOptions {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
}

function createRcloneRcAppApiClient(options: RcloneRcClientOptions): AppApiClient {
  const authStrategy = createAuthStrategy(options.authMode, options.basicCredentials)

  const transport = new FetchTransport({
    baseUrl: options.baseUrl,
    authStrategy,
  })

  const session = new RcloneRcSessionApi(transport, options.baseUrl)
  const jobs = new RcloneRcJobApi(transport)
  const mounts = new DisabledMountApi()

  let remotesPromise: Promise<RemoteApi> | null = null
  let explorerPromise: Promise<ExplorerApi> | null = null
  let settingsPromise: Promise<RuntimeSettingsApi> | null = null

  const loadRemotes = async (): Promise<RemoteApi> => {
    remotesPromise ??= import("@/shared/api/adapters/rclone-rc/remote-api").then(
      ({ RcloneRcRemoteApi }) => new RcloneRcRemoteApi(transport),
    )
    return remotesPromise
  }

  const loadExplorer = async (): Promise<ExplorerApi> => {
    explorerPromise ??= import("@/shared/api/adapters/rclone-rc/explorer-api").then(
      ({ RcloneRcExplorerApi }) => new RcloneRcExplorerApi(transport),
    )
    return explorerPromise
  }

  const loadSettings = async (): Promise<RuntimeSettingsApi> => {
    settingsPromise ??= import("@/shared/api/adapters/rclone-rc/runtime-settings-api").then(
      ({ RcloneRcRuntimeSettingsApi }) => new RcloneRcRuntimeSettingsApi(transport),
    )
    return settingsPromise
  }

  const remotes: RemoteApi = {
    async list() {
      return (await loadRemotes()).list()
    },
    async get(name) {
      return (await loadRemotes()).get(name)
    },
    async create(input) {
      return (await loadRemotes()).create(input)
    },
    async update(input) {
      return (await loadRemotes()).update(input)
    },
    async delete(name) {
      return (await loadRemotes()).delete(name)
    },
    async dump() {
      return (await loadRemotes()).dump()
    },
  }

  const explorer: ExplorerApi = {
    async list(location, options) {
      return (await loadExplorer()).list(location, options)
    },
    async stat(location, options) {
      return (await loadExplorer()).stat(location, options)
    },
    async size(location) {
      return (await loadExplorer()).size(location)
    },
    async getFsInfo(location) {
      return (await loadExplorer()).getFsInfo(location)
    },
    async getUsage(location) {
      return (await loadExplorer()).getUsage(location)
    },
    async cleanup(location) {
      return (await loadExplorer()).cleanup(location)
    },
    async mkdir(location, name) {
      return (await loadExplorer()).mkdir(location, name)
    },
    async deleteFile(target) {
      return (await loadExplorer()).deleteFile(target)
    },
    async deleteDir(target) {
      return (await loadExplorer()).deleteDir(target)
    },
    async copyFile(input) {
      return (await loadExplorer()).copyFile(input)
    },
    async moveFile(input) {
      return (await loadExplorer()).moveFile(input)
    },
    async copyDir(input) {
      return (await loadExplorer()).copyDir(input)
    },
    async moveDir(input) {
      return (await loadExplorer()).moveDir(input)
    },
    async syncDir(input) {
      return (await loadExplorer()).syncDir(input)
    },
    async uploadFiles(input) {
      return (await loadExplorer()).uploadFiles(input)
    },
    async publicLink(target) {
      const api = await loadExplorer()
      if (!api.publicLink) {
        throw new Error("Public links are not supported by this backend")
      }
      return api.publicLink(target)
    },
  }

  const settings: RuntimeSettingsApi = {
    async get() {
      return (await loadSettings()).get()
    },
    async update(input) {
      return (await loadSettings()).update(input)
    },
  }

  const capabilities = async (): Promise<AppCapabilities> => ({
    authModes: ["basic", "none"],
    supportsRemotes: true,
    supportsExplorer: true,
    supportsMounts: false,
    supportsRuntimeJobs: true,
    supportsRuntimeSettings: true,
    supportsSchedules: false,
    supportsPublicLink: true,
    supportsConfigMutation: true,
  })

  return {
    session,
    remotes,
    explorer,
    jobs,
    mounts: mounts as MountApi,
    settings,
    capabilities,
  }
}

export { createAppApiClient, createRcloneRcAppApiClient }
