import { describe, expect, it, vi } from "vitest"
import { RcloneRcAdapter } from "@/shared/api/adapters/rclone-rc-adapter"
import { DisabledMountApi } from "@/shared/api/adapters/rclone-rc/disabled-mount-api"
import { RcloneRcExplorerApi } from "@/shared/api/adapters/rclone-rc/explorer-api"
import { RcloneRcJobApi } from "@/shared/api/adapters/rclone-rc/job-api"
import { RcloneRcRemoteApi } from "@/shared/api/adapters/rclone-rc/remote-api"
import { RcloneRcRuntimeSettingsApi } from "@/shared/api/adapters/rclone-rc/runtime-settings-api"
import { RcloneRcSessionApi } from "@/shared/api/adapters/rclone-rc/session-api"
import type { ApiTransport } from "@/shared/api/transport/api-transport"

describe("RcloneRcAdapter", () => {
  it("wires the expected adapter implementations", () => {
    const transport: ApiTransport = {
      request: vi.fn(),
    }

    const adapter = new RcloneRcAdapter(transport, "http://localhost:5572")

    expect(adapter.session).toBeInstanceOf(RcloneRcSessionApi)
    expect(adapter.remotes).toBeInstanceOf(RcloneRcRemoteApi)
    expect(adapter.explorer).toBeInstanceOf(RcloneRcExplorerApi)
    expect(adapter.jobs).toBeInstanceOf(RcloneRcJobApi)
    expect(adapter.mounts).toBeInstanceOf(DisabledMountApi)
    expect(adapter.settings).toBeInstanceOf(RcloneRcRuntimeSettingsApi)
  })

  it("reports the current capabilities", async () => {
    const adapter = new RcloneRcAdapter(
      {
        request: vi.fn(),
      },
      "http://localhost:5572",
    )

    await expect(adapter.capabilities()).resolves.toEqual({
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
  })
})
