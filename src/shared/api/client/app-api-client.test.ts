import { describe, expect, it, vi } from "vitest"
import { createAppApiClient } from "@/shared/api/client/app-api-client"
import type { BackendAdapter } from "@/shared/api/adapters/backend-adapter"

describe("createAppApiClient", () => {
  it("delegates to the provided adapter", async () => {
    const capabilitiesResult = {
      authModes: ["none"],
      supportsRemotes: true,
      supportsExplorer: true,
      supportsMounts: false,
      supportsRuntimeJobs: true,
      supportsRuntimeSettings: true,
      supportsSchedules: false,
      supportsPublicLink: false,
      supportsConfigMutation: false,
    }
    const capabilities = vi.fn().mockResolvedValue(capabilitiesResult)

    const adapter: BackendAdapter = {
      session: {
        ping: vi.fn(),
        getServerInfo: vi.fn(),
        getMemStats: vi.fn(),
      },
      remotes: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        dump: vi.fn(),
      },
      explorer: {
        list: vi.fn(),
        stat: vi.fn(),
        size: vi.fn(),
        getFsInfo: vi.fn(),
        getUsage: vi.fn(),
        cleanup: vi.fn(),
        mkdir: vi.fn(),
        deleteFile: vi.fn(),
        deleteDir: vi.fn(),
        copyFile: vi.fn(),
        moveFile: vi.fn(),
        copyDir: vi.fn(),
        moveDir: vi.fn(),
        syncDir: vi.fn(),
      },
      jobs: {
        list: vi.fn(),
        get: vi.fn(),
        stop: vi.fn(),
        getStats: vi.fn(),
        getTransferred: vi.fn(),
        resetStats: vi.fn(),
        getCombinedStats: vi.fn(),
        batch: vi.fn(),
      },
      mounts: {
        list: vi.fn(),
        create: vi.fn(),
        unmount: vi.fn(),
        unmountAll: vi.fn(),
      },
      settings: {
        get: vi.fn(),
        update: vi.fn(),
      },
      capabilities,
    }

    const client = createAppApiClient(adapter)

    expect(client.session).toBe(adapter.session)
    expect(client.remotes).toBe(adapter.remotes)
    expect(client.settings).toBe(adapter.settings)
    await expect(client.capabilities()).resolves.toEqual(capabilitiesResult)
    expect(capabilities).toHaveBeenCalledTimes(1)
  })
})
