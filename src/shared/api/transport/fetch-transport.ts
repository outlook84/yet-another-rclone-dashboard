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
    const headers = { ...(input.headers ?? {}) }
    const init: RequestInit = {
      method: input.method,
      signal: input.signal,
      headers,
    }

    if (input.body !== undefined) {
      if (input.body instanceof FormData) {
        init.body = input.body
      } else {
        headers["Content-Type"] ??= "application/json"
        init.body = JSON.stringify(input.body)
      }
    }

    const authedInit = await this.authStrategy.apply(init)
    const timeoutMs = input.timeoutMs === undefined ? 15000 : input.timeoutMs

    const controller = new AbortController()
    const timeoutId =
      timeoutMs === null ? null : setTimeout(() => controller.abort(), timeoutMs)

    if (init.signal) {
      init.signal.addEventListener("abort", () => {
        if (timeoutId !== null) {
          clearTimeout(timeoutId)
        }
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
      if (timeoutId !== null) {
        clearTimeout(timeoutId)
      }
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
