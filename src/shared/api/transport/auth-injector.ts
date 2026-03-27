import type { AuthStrategy, BasicCredentials } from "@/shared/api/contracts/auth"

class NoAuthStrategy implements AuthStrategy {
  mode = "none" as const

  async apply(init: RequestInit): Promise<RequestInit> {
    return init
  }
}

class BasicAuthStrategy implements AuthStrategy {
  mode = "basic" as const
  private readonly credentials: BasicCredentials

  constructor(credentials: BasicCredentials) {
    this.credentials = credentials
  }

  async apply(init: RequestInit): Promise<RequestInit> {
    const encoded = btoa(`${this.credentials.username}:${this.credentials.password}`)
    return {
      ...init,
      headers: {
        ...(init.headers ?? {}),
        Authorization: `Basic ${encoded}`,
      },
    }
  }
}

export { NoAuthStrategy, BasicAuthStrategy }
