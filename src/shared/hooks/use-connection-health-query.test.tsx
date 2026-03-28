// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useConnectionHealthQuery } from "@/shared/hooks/use-connection-health-query"
import { useConnectionStore } from "@/shared/store/connection-store"

const apiMock = {
  session: {
    ping: vi.fn(),
  },
}

vi.mock("@/shared/api/client/api-context", () => ({
  useAppApi: () => apiMock,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useConnectionHealthQuery", () => {
  beforeEach(() => {
    apiMock.session.ping.mockReset()
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: { username: "gui", password: "" },
      lastValidatedAt: null,
      lastServerInfo: null,
    })
  })

  it("stays disabled until the connection is validated", async () => {
    const { result } = renderHook(() => useConnectionHealthQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(apiMock.session.ping).not.toHaveBeenCalled()
  })

  it("pings the validated backend", async () => {
    apiMock.session.ping.mockResolvedValue({ ok: true, latencyMs: 12 })
    useConnectionStore.setState({
      lastValidatedAt: "2026-03-28T10:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        apiBaseUrl: "https://demo.example.com/rc",
      },
    })

    const { result } = renderHook(() => useConnectionHealthQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.session.ping).toHaveBeenCalled()
    expect(result.current.data).toEqual({ ok: true, latencyMs: 12 })
  })
})
