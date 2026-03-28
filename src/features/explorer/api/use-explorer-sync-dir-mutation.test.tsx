// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerSyncDirMutation } from "@/features/explorer/api/use-explorer-sync-dir-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { explorer: { syncDir: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerSyncDirMutation", () => {
  beforeEach(() => apiMock.explorer.syncDir.mockReset())

  it("syncs directories and refreshes explorer/jobs/stats", async () => {
    apiMock.explorer.syncDir.mockResolvedValue({ jobId: 1 })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries")
    const { result } = renderHook(() => useExplorerSyncDirMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({
      srcRemote: "src",
      srcPath: "a",
      currentPath: "docs",
      dstRemote: "dst",
      dstPath: "b",
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.syncDir).toHaveBeenCalledWith({
      src: { remote: "src", path: "a" },
      dst: { remote: "dst", path: "b" },
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.explorer("scope://demo", "src", "docs") })
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: queryKeys.jobs("scope://demo") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.stats("scope://demo") })
  })
})
