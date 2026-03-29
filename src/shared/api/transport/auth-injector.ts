import type { AuthMode, AuthStrategy, BasicCredentials } from "@/shared/api/contracts/auth"

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

function createAuthStrategy(authMode: AuthMode, basicCredentials: BasicCredentials): AuthStrategy {
  return authMode === "basic" ? new BasicAuthStrategy(basicCredentials) : new NoAuthStrategy()
}

async function applyAuthStrategyToXhr(xhr: XMLHttpRequest, authStrategy: AuthStrategy) {
  const init = await authStrategy.apply({})
  const headers = new Headers(init.headers)

  headers.forEach((value, key) => {
    xhr.setRequestHeader(key, value)
  })

  if (init.credentials === "include") {
    xhr.withCredentials = true
  }
}

export { NoAuthStrategy, BasicAuthStrategy, createAuthStrategy, applyAuthStrategyToXhr }
