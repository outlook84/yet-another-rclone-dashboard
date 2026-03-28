// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useGlobalStatsQuery, useSharedGlobalStatsQuery } from "@/features/jobs/api/use-global-stats-query"
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

describe("useGlobalStatsQuery", () => {
  beforeEach(() => {
    apiMock.jobs.getCombinedStats.mockReset()
    useStatsPollingStore.setState({ intervalMs: 5000 })
  })

  it("fetches combined stats for the requested group", async () => {
    apiMock.jobs.getCombinedStats.mockResolvedValue({ stats: { speed: 10 }, mem: null, transferred: [], globalStats: {} })

    const { result } = renderHook(() => useGlobalStatsQuery("job/1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.getCombinedStats).toHaveBeenCalledWith("job/1")
    expect(result.current.data?.stats.speed).toBe(10)
  })

  it("uses the shared polling interval store", async () => {
    useStatsPollingStore.setState({ intervalMs: 1500 })
    apiMock.jobs.getCombinedStats.mockResolvedValue({ stats: {}, mem: null, transferred: [], globalStats: {} })

    const { result } = renderHook(() => useSharedGlobalStatsQuery("job/2"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.getCombinedStats).toHaveBeenCalledWith("job/2")
  })
})
