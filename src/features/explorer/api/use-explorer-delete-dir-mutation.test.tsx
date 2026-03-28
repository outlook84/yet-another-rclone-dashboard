// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerDeleteDirMutation } from "@/features/explorer/api/use-explorer-delete-dir-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { explorer: { deleteDir: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerDeleteDirMutation", () => {
  beforeEach(() => apiMock.explorer.deleteDir.mockReset())

  it("deletes a directory and invalidates list/usage queries", async () => {
    apiMock.explorer.deleteDir.mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useExplorerDeleteDirMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({ remote: "demo", currentPath: "docs", targetPath: "docs/archive" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.deleteDir).toHaveBeenCalledWith({ remote: "demo", path: "docs/archive" })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.explorer("scope://demo", "demo", "docs") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: [...queryKeys.explorer("scope://demo", "demo", ""), "usage"] })
  })
})
