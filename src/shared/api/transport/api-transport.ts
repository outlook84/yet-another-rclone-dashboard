export interface TransportRequest {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
  timeoutMs?: number
}

export interface ApiTransport {
  request<T>(input: TransportRequest): Promise<T>
}
