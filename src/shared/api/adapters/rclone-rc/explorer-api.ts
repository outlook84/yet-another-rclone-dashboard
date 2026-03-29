import type {
  CopyDirInput,
  CopyFileInput,
  DirTarget,
  ExplorerApi,
  ExplorerItem,
  FileTarget,
  FsInfo,
  ListOptions,
  ListResult,
  MoveDirInput,
  MoveFileInput,
  PublicLinkResult,
  RemoteLocation,
  SyncDirInput,
  UploadFilesInput,
  UsageInfo,
} from "@/shared/api/contracts/explorer"
import type { ApiTransport } from "@/shared/api/transport/api-transport"

class RcloneRcExplorerApi implements ExplorerApi {
  constructor(private readonly transport: ApiTransport) {}

  async list(location: RemoteLocation, options?: ListOptions): Promise<ListResult> {
    const response = await this.transport.request<{ list?: Array<Record<string, unknown>> }>({
      method: "POST",
      path: "operations/list",
      timeoutMs: 30000,
      body: {
        fs: `${location.remote}:`,
        remote: location.path,
        opt: options ?? {},
      },
    })

    return {
      location,
      items: (response.list ?? []).map(mapExplorerItem),
    }
  }

  async stat(location: RemoteLocation, options?: ListOptions) {
    const response = await this.transport.request<{ item?: Record<string, unknown> | null }>({
      method: "POST",
      path: "operations/stat",
      body: {
        fs: `${location.remote}:`,
        remote: location.path,
        opt: options ?? {},
      },
    })

    return {
      item: response.item ? mapExplorerItem(response.item) : null,
    }
  }

  async size(location: RemoteLocation) {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "operations/size",
      body: {
        fs: `${location.remote}:${location.path}`,
      },
    })

    return {
      count: typeof response.count === "number" ? response.count : undefined,
      bytes: typeof response.bytes === "number" ? response.bytes : undefined,
      sizeless: typeof response.sizeless === "number" ? response.sizeless : undefined,
    }
  }

  async getFsInfo(location: RemoteLocation): Promise<FsInfo> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "operations/fsinfo",
      body: { fs: `${location.remote}:` },
    })

    return {
      features: (response.features ?? response.Features) as Record<string, unknown> | undefined,
      hashes: Array.isArray(response.hashes ?? response.Hashes)
        ? ((response.hashes ?? response.Hashes) as string[])
        : undefined,
    }
  }

  async getUsage(location: RemoteLocation): Promise<UsageInfo | null> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "operations/about",
      body: { fs: `${location.remote}:` },
    })

    return {
      total: typeof response.total === "number" ? response.total : undefined,
      used: typeof response.used === "number" ? response.used : undefined,
      trashed: typeof response.trashed === "number" ? response.trashed : undefined,
      other: typeof response.other === "number" ? response.other : undefined,
      free: typeof response.free === "number" ? response.free : undefined,
      objects: typeof response.objects === "number" ? response.objects : undefined,
    }
  }

  async cleanup(location: RemoteLocation) {
    const response = await this.transport.request<{ jobid?: number | string }>({
      method: "POST",
      path: "operations/cleanup",
      body: { _async: true, fs: `${location.remote}:` },
    })

    return response.jobid ? { jobId: response.jobid } : undefined
  }

  async mkdir(location: RemoteLocation, name: string): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "operations/mkdir",
      body: { fs: `${location.remote}:`, remote: `${location.path}/${name}` },
    })
  }

  async deleteFile(target: FileTarget): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "operations/deletefile",
      body: { fs: `${target.remote}:`, remote: target.path },
    })
  }

  async deleteDir(target: DirTarget): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "operations/purge",
      body: { fs: `${target.remote}:`, remote: target.path },
    })
  }

  async copyFile(input: CopyFileInput) {
    const response = await this.transport.request<{ jobid?: number | string }>({
      method: "POST",
      path: "operations/copyfile",
      body: {
        _async: true,
        srcFs: `${input.src.remote}:`,
        srcRemote: input.src.path,
        dstFs: `${input.dst.remote}:`,
        dstRemote: input.dst.path,
      },
    })

    return response.jobid ? { jobId: response.jobid } : undefined
  }

  async moveFile(input: MoveFileInput) {
    const response = await this.transport.request<{ jobid?: number | string }>({
      method: "POST",
      path: "operations/movefile",
      body: {
        _async: true,
        srcFs: `${input.src.remote}:`,
        srcRemote: input.src.path,
        dstFs: `${input.dst.remote}:`,
        dstRemote: input.dst.path,
      },
    })

    return response.jobid ? { jobId: response.jobid } : undefined
  }

  async copyDir(input: CopyDirInput) {
    const response = await this.transport.request<{ jobid?: number | string }>({
      method: "POST",
      path: "sync/copy",
      body: {
        _async: true,
        srcFs: `${input.src.remote}:${input.src.path}`,
        dstFs: `${input.dst.remote}:${input.dst.path}`,
      },
    })

    return response.jobid ? { jobId: response.jobid } : undefined
  }

  async moveDir(input: MoveDirInput) {
    const response = await this.transport.request<{ jobid?: number | string }>({
      method: "POST",
      path: "sync/move",
      body: {
        _async: true,
        srcFs: `${input.src.remote}:${input.src.path}`,
        dstFs: `${input.dst.remote}:${input.dst.path}`,
      },
    })

    return response.jobid ? { jobId: response.jobid } : undefined
  }

  async syncDir(input: SyncDirInput) {
    const response = await this.transport.request<{ jobid?: number | string }>({
      method: "POST",
      path: "sync/sync",
      body: {
        _async: true,
        srcFs: `${input.src.remote}:${input.src.path}`,
        dstFs: `${input.dst.remote}:${input.dst.path}`,
      },
    })

    return response.jobid ? { jobId: response.jobid } : undefined
  }

  async uploadFiles(input: UploadFilesInput): Promise<void> {
    const formData = new FormData()

    input.files.forEach((file, index) => {
      formData.append(`file${index}`, file)
    })

    await this.transport.request<void>({
      method: "POST",
      path: `operations/uploadfile?fs=${encodeURIComponent(`${input.dst.remote}:`)}&remote=${encodeURIComponent(input.dst.path)}`,
      body: formData,
      timeoutMs: null,
    })
  }

  async publicLink(target: FileTarget): Promise<PublicLinkResult> {
    const response = await this.transport.request<{ url?: string }>({
      method: "POST",
      path: "operations/publiclink",
      body: { fs: `${target.remote}:`, remote: target.path },
    })

    if (typeof response.url !== "string" || !response.url) {
      throw new Error("Public link request succeeded but rclone did not return a url")
    }

    return { url: response.url }
  }
}

function mapExplorerItem(item: Record<string, unknown>): ExplorerItem {
  return {
    path: String(item.Path ?? ""),
    name: String(item.Name ?? item.Path ?? ""),
    type: item.IsDir ? "dir" : "file",
    size: typeof item.Size === "number" ? item.Size : undefined,
    modTime: typeof item.ModTime === "string" ? item.ModTime : undefined,
    mimeType: typeof item.MimeType === "string" ? item.MimeType : undefined,
    hashes:
      item.Hashes && typeof item.Hashes === "object"
        ? (item.Hashes as Record<string, string>)
        : undefined,
    isBucket: typeof item.IsBucket === "boolean" ? item.IsBucket : undefined,
  }
}

export { RcloneRcExplorerApi }
