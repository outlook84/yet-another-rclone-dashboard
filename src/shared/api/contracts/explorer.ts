export interface RemoteLocation {
  remote: string
  path: string
}

export interface ListOptions {
  recurse?: boolean
  showHash?: boolean
  showModTime?: boolean
}

export interface ExplorerItem {
  path: string
  name: string
  type: "file" | "dir"
  size?: number
  mimeType?: string
  modTime?: string
  hashes?: Record<string, string>
  isBucket?: boolean
}

export interface ListResult {
  location: RemoteLocation
  items: ExplorerItem[]
}

export interface FsInfo {
  features?: Record<string, unknown>
  hashes?: string[]
}

export interface ExplorerStatResult {
  item: ExplorerItem | null
}

export interface ExplorerSizeResult {
  count?: number
  bytes?: number
  sizeless?: number
}

export interface UsageInfo {
  total?: number
  used?: number
  trashed?: number
  other?: number
  free?: number
  objects?: number
}

export interface FileTarget {
  remote: string
  path: string
}

export interface DirTarget {
  remote: string
  path: string
}

export interface CopyFileInput {
  src: FileTarget
  dst: FileTarget
}

export interface MoveFileInput {
  src: FileTarget
  dst: FileTarget
}

export interface CopyDirInput {
  src: DirTarget
  dst: DirTarget
}

export interface MoveDirInput {
  src: DirTarget
  dst: DirTarget
}

export interface SyncDirInput {
  src: DirTarget
  dst: DirTarget
}

export interface JobHandle {
  jobId: number | string
}

export interface PublicLinkResult {
  url: string
}

export interface ExplorerApi {
  list(location: RemoteLocation, options?: ListOptions): Promise<ListResult>
  stat(location: RemoteLocation, options?: ListOptions): Promise<ExplorerStatResult>
  size(location: RemoteLocation): Promise<ExplorerSizeResult>
  getFsInfo(location: RemoteLocation): Promise<FsInfo>
  getUsage(location: RemoteLocation): Promise<UsageInfo | null>
  cleanup(location: RemoteLocation): Promise<JobHandle | void>
  mkdir(location: RemoteLocation, name: string): Promise<void>
  deleteFile(target: FileTarget): Promise<void>
  deleteDir(target: DirTarget): Promise<void>
  copyFile(input: CopyFileInput): Promise<JobHandle | void>
  moveFile(input: MoveFileInput): Promise<JobHandle | void>
  copyDir(input: CopyDirInput): Promise<JobHandle | void>
  moveDir(input: MoveDirInput): Promise<JobHandle | void>
  syncDir(input: SyncDirInput): Promise<JobHandle | void>
  publicLink?(target: FileTarget): Promise<PublicLinkResult>
}
