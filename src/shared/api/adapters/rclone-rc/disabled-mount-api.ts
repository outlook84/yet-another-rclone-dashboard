import type { CreateMountInput, MountApi, MountInfo } from "@/shared/api/contracts/mounts"

const MOUNTS_DISABLED_MESSAGE = "Mount operations are disabled for this build"

class DisabledMountApi implements MountApi {
  async list(): Promise<MountInfo[]> {
    throw new Error(MOUNTS_DISABLED_MESSAGE)
  }

  async create(input: CreateMountInput): Promise<void> {
    void input
    throw new Error(MOUNTS_DISABLED_MESSAGE)
  }

  async unmount(mountPoint: string): Promise<void> {
    void mountPoint
    throw new Error(MOUNTS_DISABLED_MESSAGE)
  }

  async unmountAll(): Promise<void> {
    throw new Error(MOUNTS_DISABLED_MESSAGE)
  }
}

export { DisabledMountApi }
