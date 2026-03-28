// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerSizeQuery } from "@/features/explorer/api/use-explorer-size-query"

const apiMock = {
  explorer: {
    size: vi.fn(),
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

describe("useExplorerSizeQuery", () => {
  beforeEach(() => {
    apiMock.explorer.size.mockReset()
  })

  it("fetches size when enabled and remote is set", async () => {
    apiMock.explorer.size.mockResolvedValue({ bytes: 123 })

    const { result } = renderHook(() => useExplorerSizeQuery("demo", "docs", true), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.size).toHaveBeenCalledWith({ remote: "demo", path: "docs" })
    expect(result.current.data).toEqual({ bytes: 123 })
  })

  it("stays disabled when explicitly disabled", async () => {
    const { result } = renderHook(() => useExplorerSizeQuery("demo", "docs", false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(apiMock.explorer.size).not.toHaveBeenCalled()
  })
})
