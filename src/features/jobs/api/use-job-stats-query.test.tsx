// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useJobStatsQuery, useSharedJobStatsQuery } from "@/features/jobs/api/use-job-stats-query"
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

describe("useJobStatsQuery", () => {
  beforeEach(() => {
    apiMock.jobs.getCombinedStats.mockReset()
    useStatsPollingStore.setState({ intervalMs: 5000 })
  })

  it("projects combined stats down to stats data", async () => {
    apiMock.jobs.getCombinedStats.mockResolvedValue({
      stats: { bytes: 42 },
      mem: { HeapAlloc: 1 },
      transferred: [],
      globalStats: {},
    })

    const { result } = renderHook(() => useJobStatsQuery("job/1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ bytes: 42 })
  })

  it("supports the shared polling variant", async () => {
    apiMock.jobs.getCombinedStats.mockResolvedValue({
      stats: { speed: 99 },
      mem: null,
      transferred: [],
      globalStats: {},
    })
    useStatsPollingStore.setState({ intervalMs: 1200 })

    const { result } = renderHook(() => useSharedJobStatsQuery("job/2"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ speed: 99 })
    expect(apiMock.jobs.getCombinedStats).toHaveBeenCalledWith("job/2")
  })
})
