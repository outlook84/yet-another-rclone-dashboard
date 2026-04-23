// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useConnectionHealthQuery } from "@/shared/hooks/use-connection-health-query"
import { useConnectionStore } from "@/shared/store/connection-store"

const apiMock = {
  jobs: {
    batch: vi.fn(),
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
    apiMock.jobs.batch.mockReset()
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
    expect(apiMock.jobs.batch).not.toHaveBeenCalled()
  })

  it("checks health and refreshes the validated backend version", async () => {
    apiMock.jobs.batch.mockResolvedValue([{ ok: true }, { version: "1.70.0" }])
    useConnectionStore.setState({
      lastValidatedAt: "2026-03-28T10:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.69.0",
        apiBaseUrl: "https://demo.example.com/rc",
      },
    })

    const { result } = renderHook(() => useConnectionHealthQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.batch).toHaveBeenCalledWith([{ _path: "rc/noopauth" }, { _path: "core/version" }])
    expect(result.current.data?.ok).toBe(true)
    expect(result.current.data?.latencyMs).toEqual(expect.any(Number))
    expect(useConnectionStore.getState().lastServerInfo).toMatchObject({
      product: "rclone",
      version: "1.70.0",
      apiBaseUrl: "https://demo.example.com/rc",
    })
  })

  it("keeps health success even when the version refresh payload fails", async () => {
    apiMock.jobs.batch.mockResolvedValue([{ ok: true }, { error: "version unavailable", status: 500 }])
    useConnectionStore.setState({
      lastValidatedAt: "2026-03-28T10:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.69.0",
        apiBaseUrl: "https://demo.example.com/rc",
      },
    })

    const { result } = renderHook(() => useConnectionHealthQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(useConnectionStore.getState().lastServerInfo?.version).toBe("1.69.0")
  })
})
