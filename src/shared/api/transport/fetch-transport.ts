import { BackendUnavailableError, UnknownApiError } from "@/shared/api/contracts/errors"
import type { AuthStrategy } from "@/shared/api/contracts/auth"
import type { ApiTransport, TransportRequest } from "@/shared/api/transport/api-transport"

interface FetchTransportOptions {
  baseUrl: string
  authStrategy: AuthStrategy
}

class FetchTransport implements ApiTransport {
  private readonly baseUrl: string
  private readonly authStrategy: AuthStrategy

  constructor(options: FetchTransportOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "")
    this.authStrategy = options.authStrategy
  }

  async request<T>(input: TransportRequest): Promise<T> {
    const init: RequestInit = {
      method: input.method,
      signal: input.signal,
      headers: {
        "Content-Type": "application/json",
        ...input.headers,
      },
    }

    if (input.body !== undefined) {
      init.body = JSON.stringify(input.body)
    }

    const authedInit = await this.authStrategy.apply(init)
    const timeoutMs = input.timeoutMs ?? 15000 // 15 seconds timeout by default

    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    if (init.signal) {
      init.signal.addEventListener("abort", () => {
        clearTimeout(timeoutId)
        controller.abort()
      })
    }

    let response: Response
    try {
      response = await fetch(`${this.baseUrl}/${input.path.replace(/^\/+/, "")}`, {
        ...authedInit,
        signal: controller.signal,
      })
    } catch (cause) {
      if (cause instanceof Error && cause.name === "AbortError") {
        throw new BackendUnavailableError("Backend request timed out", {
          code: "backend_timeout",
          type: "timeout",
          cause,
        })
      }

      throw new BackendUnavailableError("Backend request failed", {
        code: "backend_unavailable",
        type: "network",
        cause,
      })
    } finally {
      clearTimeout(timeoutId)
    }

    const payload = await response
      .json()
      .catch(() => undefined as unknown)

    if (!response.ok) {
      throw new UnknownApiError("API request failed", {
        code: "api_error",
        status: response.status,
        cause: payload,
      })
    }

    return payload as T
  }
}

export { FetchTransport }
