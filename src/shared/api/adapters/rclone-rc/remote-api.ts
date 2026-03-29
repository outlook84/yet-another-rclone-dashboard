import type { CreateRemoteInput, RemoteApi, RemoteDetail, RemoteSummary, UpdateRemoteInput } from "@/shared/api/contracts/remotes"
import type { ApiTransport } from "@/shared/api/transport/api-transport"
import { isValidRemoteName } from "@/shared/lib/remote-name"

interface RcloneRcRemoteApiOptions {
  invalidRemoteNameMessage?: string
}

class RcloneRcRemoteApi implements RemoteApi {
  private readonly invalidRemoteNameMessage: string

  constructor(
    private readonly transport: ApiTransport,
    options: RcloneRcRemoteApiOptions = {},
  ) {
    this.invalidRemoteNameMessage =
      options.invalidRemoteNameMessage ??
      "Remote name contains invalid characters. Rclone allows letters, numbers, `_`, `-`, `.`, `+`, `@`, and spaces between segments, but the name cannot start with `-` or space, or end with space."
  }

  async list(): Promise<RemoteSummary[]> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "config/dump",
      body: {},
    })

    return Object.entries(response)
      .filter(([, value]) => value && typeof value === "object" && !Array.isArray(value))
      .map(([name, value]) => {
        const config = value as Record<string, unknown>

        return {
          name,
          backend: typeof config.type === "string" ? config.type : undefined,
          status: "ready" as const,
        }
      })
      .sort((left, right) => left.name.localeCompare(right.name))
  }

  async get(name: string): Promise<RemoteDetail> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "config/get",
      body: { name },
    })

    return {
      name,
      backend: typeof response.type === "string" ? response.type : undefined,
      config: response,
      source: "rclone-rc",
    }
  }

  async create(input: CreateRemoteInput): Promise<RemoteDetail> {
    if (!isValidRemoteName(input.name)) {
      throw new Error(this.invalidRemoteNameMessage)
    }

    const remoteType = input.config.type
    if (typeof remoteType !== "string" || !remoteType.trim()) {
      throw new Error("Remote JSON must include a string \"type\" field")
    }

    const parameters = { ...input.config }
    delete parameters.type

    await this.transport.request({
      method: "POST",
      path: "config/create",
      body: {
        name: input.name,
        type: remoteType,
        parameters,
      },
    })

    return this.get(input.name)
  }

  async update(input: UpdateRemoteInput): Promise<RemoteDetail> {
    await this.transport.request({
      method: "POST",
      path: "config/update",
      body: {
        name: input.name,
        parameters: input.config,
      },
    })

    return this.get(input.name)
  }

  async delete(name: string): Promise<void> {
    await this.transport.request({
      method: "POST",
      path: "config/delete",
      body: { name },
    })
  }

  async dump(): Promise<Record<string, Record<string, unknown>>> {
    const response = await this.transport.request<Record<string, unknown>>({
      method: "POST",
      path: "config/dump",
      body: {},
    })

    return Object.fromEntries(
      Object.entries(response).filter(([, value]) => value && typeof value === "object" && !Array.isArray(value)),
    ) as Record<string, Record<string, unknown>>
  }
}

export { RcloneRcRemoteApi }
