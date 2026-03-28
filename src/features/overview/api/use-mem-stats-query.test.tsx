// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMemStatsQuery, useSharedMemStatsQuery } from "@/features/overview/api/use-mem-stats-query"
import { useStatsPollingStore } from "@/features/jobs/store/stats-polling-store"

const apiMock = {
  jobs: {
    getCombinedStats: vi.fn(),
  },
}

vi.mock("@/shared/api/client/api-context", () => ({
  useAppApi: () => apiMock,
}))

vi.mock("@/shared/hooks/use-connection-scope", () => ({
  useConnectionScope: () => "scope://demo",
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

describe("useMemStatsQuery", () => {
  beforeEach(() => {
    apiMock.jobs.getCombinedStats.mockReset()
    useStatsPollingStore.setState({ intervalMs: 5000 })
  })

  it("projects combined stats down to mem data", async () => {
    apiMock.jobs.getCombinedStats.mockResolvedValue({
      stats: {},
      mem: { HeapAlloc: 123 },
      transferred: [],
      globalStats: {},
    })

    const { result } = renderHook(() => useMemStatsQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ HeapAlloc: 123 })
  })

  it("supports the shared polling variant", async () => {
    apiMock.jobs.getCombinedStats.mockResolvedValue({
      stats: {},
      mem: { HeapAlloc: 456 },
      transferred: [],
      globalStats: {},
    })
    useStatsPollingStore.setState({ intervalMs: 900 })

    const { result } = renderHook(() => useSharedMemStatsQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ HeapAlloc: 456 })
    expect(apiMock.jobs.getCombinedStats).toHaveBeenCalledWith(undefined)
  })
})
