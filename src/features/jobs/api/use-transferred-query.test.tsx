// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useSharedTransferredQuery, useTransferredQuery } from "@/features/jobs/api/use-transferred-query"
import { useStatsPollingStore } from "@/features/jobs/store/stats-polling-store"

const apiMock = {
  jobs: {
    getTransferred: vi.fn(),
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

describe("useTransferredQuery", () => {
  beforeEach(() => {
    apiMock.jobs.getTransferred.mockReset()
    useStatsPollingStore.setState({ intervalMs: 5000 })
  })

  it("fetches transferred items for a group", async () => {
    apiMock.jobs.getTransferred.mockResolvedValue([{ name: "demo.txt" }])

    const { result } = renderHook(() => useTransferredQuery("job/1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.getTransferred).toHaveBeenCalledWith("job/1")
    expect(result.current.data).toEqual([{ name: "demo.txt" }])
  })

  it("uses the shared polling interval", async () => {
    apiMock.jobs.getTransferred.mockResolvedValue([])
    useStatsPollingStore.setState({ intervalMs: 1700 })

    const { result } = renderHook(() => useSharedTransferredQuery("job/2"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.getTransferred).toHaveBeenCalledWith("job/2")
  })
})
