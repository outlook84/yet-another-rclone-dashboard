import type { CreateMountInput, MountApi, MountInfo } from "@/shared/api/contracts/mounts"
import type { ApiTransport } from "@/shared/api/transport/api-transport"

class RcloneRcMountApi implements MountApi {
  constructor(private readonly transport: ApiTransport) {}

  async list(): Promise<MountInfo[]> {
    const response = await this.transport.request<{ mountPoints?: Record<string, Record<string, unknown>> }>({
      method: "POST",
      path: "mount/listmounts",
      body: {},
    })

    return Object.entries(response.mountPoints ?? {}).map(([mountPoint, value]) => ({
      mountPoint,
      fs: typeof value.fs === "string" ? value.fs : "",
      mountType: typeof value.mountType === "string" ? value.mountType : undefined,
      vfsOpt: (value.vfsOpt as Record<string, unknown> | undefined) ?? undefined,
      mountOpt: (value.mountOpt as Record<string, unknown> | undefined) ?? undefined,
    }))
  }

  async create(input: CreateMountInput): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "mount/mount",
      body: input,
    })
  }

  async unmount(mountPoint: string): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "mount/unmount",
      body: { mountPoint },
    })
  }

  async unmountAll(): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "mount/unmountall",
      body: {},
    })
  }
}

export { RcloneRcMountApi }
