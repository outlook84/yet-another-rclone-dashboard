// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerCleanupMutation } from "@/features/explorer/api/use-explorer-cleanup-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = {
  explorer: {
    cleanup: vi.fn(),
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

describe("useExplorerCleanupMutation", () => {
  beforeEach(() => {
    apiMock.explorer.cleanup.mockReset()
  })

  it("runs cleanup and invalidates fs-info and usage queries", async () => {
    apiMock.explorer.cleanup.mockResolvedValue({ jobId: 7 })
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useExplorerCleanupMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({ remote: "demo" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.cleanup).toHaveBeenCalledWith({ remote: "demo", path: "" })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...queryKeys.explorer("scope://demo", "demo", ""), "fsinfo"],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...queryKeys.explorer("scope://demo", "demo", ""), "usage"],
    })
  })
})
