// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerUsageQuery } from "@/features/explorer/api/use-explorer-usage-query"

const apiMock = {
  explorer: {
    getUsage: vi.fn(),
  },
}

type CacheTimingOptions = {
  staleTime?: number
}

vi.mock("@/shared/api/client/api-context", () => ({
  useAppApi: () => apiMock,
}))

vi.mock("@/shared/hooks/use-connection-scope", () => ({
  useConnectionScope: () => "scope://demo",
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerUsageQuery", () => {
  beforeEach(() => {
    apiMock.explorer.getUsage.mockReset()
  })

  it("fetches usage for the resolved remote", async () => {
    apiMock.explorer.getUsage.mockResolvedValue({ free: 500 })

    const { result } = renderHook(() => useExplorerUsageQuery("ignored", true, "demo"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.getUsage).toHaveBeenCalledWith({ remote: "demo", path: "" })
    expect(result.current.data).toEqual({ free: 500 })
  })

  it("stays disabled when remote is missing", async () => {
    const { result } = renderHook(() => useExplorerUsageQuery("", true, null), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(apiMock.explorer.getUsage).not.toHaveBeenCalled()
  })

  it("configures a medium-lived usage cache", async () => {
    apiMock.explorer.getUsage.mockResolvedValue({ free: 500 })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(() => useExplorerUsageQuery("demo"), { wrapper })

    await waitFor(() => expect(apiMock.explorer.getUsage).toHaveBeenCalledWith({ remote: "demo", path: "" }))

    const query = queryClient.getQueryCache().find({ queryKey: ["scope", "scope://demo", "explorer", "demo", "", "usage"] })
    const options = query?.options as CacheTimingOptions | undefined

    expect(options?.staleTime).toBe(60 * 1000)
  })

  it("reuses cached usage data across remounts within stale time", async () => {
    apiMock.explorer.getUsage.mockResolvedValue({ free: 500 })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    const first = renderHook(() => useExplorerUsageQuery("demo"), { wrapper })
    await waitFor(() => expect(first.result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.getUsage).toHaveBeenCalledTimes(1)

    first.unmount()

    const second = renderHook(() => useExplorerUsageQuery("demo"), { wrapper })
    await waitFor(() => expect(second.result.current.isSuccess).toBe(true))

    expect(apiMock.explorer.getUsage).toHaveBeenCalledTimes(1)
  })
})
