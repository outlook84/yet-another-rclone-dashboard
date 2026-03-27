export interface MountInfo {
  mountPoint: string
  fs: string
  mountType?: string
  vfsOpt?: Record<string, unknown>
  mountOpt?: Record<string, unknown>
}

export interface CreateMountInput {
  fs: string
  mountPoint: string
  mountType?: string
  vfsOpt?: Record<string, unknown>
  mountOpt?: Record<string, unknown>
}

export interface MountApi {
  list(): Promise<MountInfo[]>
  create(input: CreateMountInput): Promise<void>
  unmount(mountPoint: string): Promise<void>
  unmountAll(): Promise<void>
}
