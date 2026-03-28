// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerMkdirMutation } from "@/features/explorer/api/use-explorer-mkdir-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { explorer: { mkdir: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerMkdirMutation", () => {
  beforeEach(() => apiMock.explorer.mkdir.mockReset())

  it("creates a directory and invalidates list/usage queries", async () => {
    apiMock.explorer.mkdir.mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useExplorerMkdirMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({ remote: "demo", path: "docs", name: "new-folder" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.mkdir).toHaveBeenCalledWith({ remote: "demo", path: "docs" }, "new-folder")
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.explorer("scope://demo", "demo", "docs") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [...queryKeys.explorer("scope://demo", "demo", ""), "usage"] })
  })
})
