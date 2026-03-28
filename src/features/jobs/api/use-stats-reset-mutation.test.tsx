// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useStatsResetMutation } from "@/features/jobs/api/use-stats-reset-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = {
  jobs: {
    resetStats: vi.fn(),
  },
}

vi.mock("@/shared/api/client/api-context", () => ({
  useAppApi: () => apiMock,
}))

vi.mock("@/shared/hooks/use-connection-scope", () => ({
  useConnectionScope: () => "scope://demo",
}))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useStatsResetMutation", () => {
  beforeEach(() => {
    apiMock.jobs.resetStats.mockReset()
  })

  it("resets scoped stats and invalidates group plus global stats", async () => {
    apiMock.jobs.resetStats.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useStatsResetMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate("job/1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.resetStats).toHaveBeenCalledWith("job/1")
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stats("scope://demo", "job/1"),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stats("scope://demo"),
    })
  })
})
