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
})
