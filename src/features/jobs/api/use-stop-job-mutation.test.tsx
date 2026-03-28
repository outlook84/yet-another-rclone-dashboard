// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useStopJobMutation } from "@/features/jobs/api/use-stop-job-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = {
  jobs: {
    stop: vi.fn(),
    stopGroup: vi.fn(),
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

describe("useStopJobMutation", () => {
  beforeEach(() => {
    apiMock.jobs.stop.mockReset()
    apiMock.jobs.stopGroup.mockReset()
  })

  it("stops a direct job id and invalidates job and stats queries", async () => {
    apiMock.jobs.stop.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useStopJobMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate("job-1")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiMock.jobs.stop).toHaveBeenCalledWith("job-1")
    expect(apiMock.jobs.stopGroup).not.toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.jobs("scope://demo"),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stats("scope://demo"),
    })
  })

  it("stops a job group when the target uses the job/<id> group format", async () => {
    apiMock.jobs.stopGroup.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const { result } = renderHook(() => useStopJobMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate("job/42")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiMock.jobs.stopGroup).toHaveBeenCalledWith("job/42")
    expect(apiMock.jobs.stop).not.toHaveBeenCalled()
  })
})
