import type { AuthMode } from "@/shared/api/contracts/auth"

export interface PingResult {
  ok: boolean
  latencyMs?: number
}

export interface ServerInfo {
  product: "rclone" | "gateway" | "unknown"
  version?: string
  apiBaseUrl: string
  serverTime?: string
}

export interface MemStats {
  Alloc: number
  TotalAlloc: number
  Sys: number
  Mallocs: number
  Frees: number
  HeapAlloc: number
  HeapSys: number
  HeapIdle: number
  HeapInuse: number
  HeapReleased: number
  HeapObjects: number
  StackInuse: number
  StackSys: number
  MSpanInuse: number
  MSpanSys: number
  MCacheInuse: number
  MCacheSys: number
  BuckHashSys: number
  GCSys: number
  OtherSys: number
}

export interface SessionApi {
  ping(): Promise<PingResult>
  getServerInfo(): Promise<ServerInfo>
  getAuthModes?(): Promise<AuthMode[]>
  getMemStats(): Promise<MemStats>
}
