// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { useRcServeAvailabilityQuery } from "@/features/explorer/api/use-rc-serve-availability-query"
import { useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
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
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      lastValidatedAt: "2026-03-26T07:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://server-a:5572",
      },
      validationRevision: 0,
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-a",
          name: "Server A",
          baseUrl: "http://server-a:5572",
          authMode: "none",
          basicCredentials: {
            username: "",
            password: "",
          },
          syncEnabled: false,
          uploadEnabled: false,
          updatedAt: "2026-03-26T07:00:00.000Z",
        },
      ],
      activeProfileId: "profile-a",
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

    useSavedConnectionsStore.setState({
      profiles: [
        ...useSavedConnectionsStore.getState().profiles,
        {
          id: "profile-b",
          name: "Server B",
          baseUrl: "http://server-b:5572",
          authMode: "none",
          basicCredentials: {
            username: "",
            password: "",
          },
          syncEnabled: false,
          uploadEnabled: false,
          updatedAt: "2026-03-26T07:00:00.000Z",
        },
      ],
      activeProfileId: "profile-b",
    })

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

  it("does not probe from unsaved runtime connection state", () => {
    const fetchMock = vi.fn()
    vi.stubGlobal("fetch", fetchMock)
    useConnectionStore.setState({
      baseUrl: "http://server-unsaved:5572",
      authMode: "none",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://server-unsaved:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-basic",
          name: "Basic Server",
          baseUrl: "http://server-basic:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: false,
          uploadEnabled: false,
          updatedAt: "2026-03-26T07:00:00.000Z",
        },
      ],
      activeProfileId: "profile-basic",
    })

    renderHook(() => useRcServeAvailabilityQuery(), {
      wrapper: createWrapper(),
    })

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
