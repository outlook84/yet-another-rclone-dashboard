// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerListQuery } from "@/features/explorer/api/use-explorer-list-query"

const apiMock = {
  explorer: {
    list: vi.fn(),
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

describe("useExplorerListQuery", () => {
  beforeEach(() => {
    apiMock.explorer.list.mockReset()
  })

  it("fetches explorer list when a remote is present", async () => {
    apiMock.explorer.list.mockResolvedValue({ location: { remote: "demo", path: "docs" }, items: [] })

    const { result } = renderHook(() => useExplorerListQuery("demo", "docs"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.list).toHaveBeenCalledWith({ remote: "demo", path: "docs" })
  })

  it("stays disabled when the remote is empty", async () => {
    const { result } = renderHook(() => useExplorerListQuery("", "docs"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(apiMock.explorer.list).not.toHaveBeenCalled()
  })
})
