// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest"
import { BackendUnavailableError, UnknownApiError } from "@/shared/api/contracts/errors"
import { FetchTransport } from "@/shared/api/transport/fetch-transport"

describe("FetchTransport", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it("builds the request url, serializes the body, and applies auth headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ ok: true }),
    })
    vi.stubGlobal("fetch", fetchMock)

    const transport = new FetchTransport({
      baseUrl: "http://localhost:5572/",
      authStrategy: {
        mode: "basic",
        apply: vi.fn(async (init) => ({
          ...init,
          headers: {
            ...(init.headers ?? {}),
            Authorization: "Basic token",
          },
        })),
      },
    })

    await expect(
      transport.request({
        method: "POST",
        path: "/core/version",
        body: { ping: true },
      }),
    ).resolves.toEqual({ ok: true })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("http://localhost:5572/core/version")
    expect(init).toMatchObject({
      method: "POST",
      body: JSON.stringify({ ping: true }),
      headers: {
        "Content-Type": "application/json",
        Authorization: "Basic token",
      },
    })
  })

  it("maps aborted requests to timeout errors and other failures to network errors", async () => {
    const abortError = new Error("Aborted")
    abortError.name = "AbortError"
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(abortError))

    const transport = new FetchTransport({
      baseUrl: "http://localhost:5572",
      authStrategy: {
        mode: "none",
        apply: async (init) => init,
      },
    })

    await expect(
      transport.request({
        method: "POST",
        path: "core/version",
      }),
    ).rejects.toBeInstanceOf(BackendUnavailableError)
    await expect(
      transport.request({
        method: "POST",
        path: "core/version",
      }),
    ).rejects.toMatchObject({ type: "timeout" })

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("network down")),
    )

    await expect(
      transport.request({
        method: "POST",
        path: "core/version",
      }),
    ).rejects.toMatchObject({
      type: "network",
      code: "backend_unavailable",
    })
  })

  it("wraps non-ok responses as unknown api errors with status and payload", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: vi.fn().mockResolvedValue({ error: "boom" }),
      }),
    )

    const transport = new FetchTransport({
      baseUrl: "http://localhost:5572",
      authStrategy: {
        mode: "none",
        apply: async (init) => init,
      },
    })

    await expect(
      transport.request({
        method: "POST",
        path: "core/version",
      }),
    ).rejects.toEqual(
      expect.objectContaining<Partial<UnknownApiError>>({
        code: "api_error",
        status: 500,
        cause: { error: "boom" },
      }),
    )
  })
})
