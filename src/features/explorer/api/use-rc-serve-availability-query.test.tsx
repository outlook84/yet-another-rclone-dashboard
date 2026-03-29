// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRcServeAvailabilityQuery } from "@/features/explorer/api/use-rc-serve-availability-query"
import { useConnectionStore } from "@/shared/store/connection-store"

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useRcServeAvailabilityQuery", () => {
  beforeEach(() => {
    useConnectionStore.setState({
      baseUrl: "http://server-a:5572",
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 0,
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("does not carry the previous connection's availability into a new scope", async () => {
    let resolveSecondProbe: ((value: Response) => void) | null = null
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockImplementationOnce(
        () =>
          new Promise<Response>((resolve) => {
            resolveSecondProbe = resolve
          }),
      )
    vi.stubGlobal("fetch", fetchMock)

    const { result } = renderHook(() => useRcServeAvailabilityQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data).toBe(true))

    useConnectionStore.getState().setBaseUrl("http://server-b:5572")

    await waitFor(() => expect(result.current.isPending || result.current.isLoading).toBe(true))
    expect(result.current.data).toBeUndefined()

    if (!resolveSecondProbe) {
      throw new Error("second probe was not started")
    }
    const resolveProbe = resolveSecondProbe as (value: Response) => void
    resolveProbe(new Response(null, { status: 404 }))

    await waitFor(() => expect(result.current.data).toBe(false))
  })

  it("retries transient probe failures instead of caching them as unsupported", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new TypeError("network down"))
      .mockRejectedValueOnce(new TypeError("still starting"))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetchMock)

    const { result } = renderHook(() => useRcServeAvailabilityQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data).toBe(true))
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it("treats 404 responses as a definitive unsupported result", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })))

    const { result } = renderHook(() => useRcServeAvailabilityQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.data).toBe(false))
    expect(result.current.isSuccess).toBe(true)
  })
})
