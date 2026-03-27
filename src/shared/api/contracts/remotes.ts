export interface RemoteSummary {
  name: string
  backend?: string
  status?: "ready" | "unknown" | "error"
}

export interface RemoteDetail {
  name: string
  backend?: string
  config: Record<string, unknown>
  source: "rclone-rc" | "gateway"
}

export interface CreateRemoteInput {
  name: string
  config: Record<string, unknown>
}

export interface UpdateRemoteInput {
  name: string
  config: Record<string, unknown>
}

export interface RemoteApi {
  list(): Promise<RemoteSummary[]>
  get(name: string): Promise<RemoteDetail>
  create(input: CreateRemoteInput): Promise<RemoteDetail>
  update(input: UpdateRemoteInput): Promise<RemoteDetail>
  delete(name: string): Promise<void>
  dump(): Promise<Record<string, Record<string, unknown>>>
}
