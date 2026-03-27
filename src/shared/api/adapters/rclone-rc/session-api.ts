import type { PingResult, ServerInfo, SessionApi } from "@/shared/api/contracts/session"
import type { ApiTransport } from "@/shared/api/transport/api-transport"

class RcloneRcSessionApi implements SessionApi {
  constructor(
    private readonly transport: ApiTransport,
    private readonly baseUrl: string,
  ) {}

  async ping(): Promise<PingResult> {
    const startedAt = performance.now()
    await this.transport.request<Record<string, never>>({
      method: "POST",
      path: "rc/noopauth",
      body: {},
    })
    return { ok: true, latencyMs: performance.now() - startedAt }
  }

  async getServerInfo(): Promise<ServerInfo> {
    const response = await this.transport.request<{ version?: string }>({
      method: "POST",
      path: "core/version",
      body: {},
    })

    return {
      product: "rclone",
      version: response.version,
      apiBaseUrl: this.baseUrl,
    }
  }

  async getMemStats() {
    const response = await this.transport.request<import("@/shared/api/contracts/session").MemStats>({
      method: "POST",
      path: "core/memstats",
      body: {},
    })

    return response
  }
}

export { RcloneRcSessionApi }
