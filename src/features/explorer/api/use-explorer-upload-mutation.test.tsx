// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerUploadMutation } from "@/features/explorer/api/use-explorer-upload-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { explorer: { uploadFiles: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerUploadMutation", () => {
  beforeEach(() => apiMock.explorer.uploadFiles.mockReset())

  it("uploads files and invalidates explorer, usage, stats, and transferred queries", async () => {
    apiMock.explorer.uploadFiles.mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useExplorerUploadMutation(), { wrapper: createWrapper(queryClient) })
    const file = new File(["hello"], "demo.txt", { type: "text/plain" })

    result.current.mutate({ remote: "demo", path: "docs", files: [file] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.uploadFiles).toHaveBeenCalledWith({
      dst: { remote: "demo", path: "docs" },
      files: [file],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.explorer("scope://demo", "demo", "docs"),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...queryKeys.explorer("scope://demo", "demo", ""), "usage"],
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.stats("scope://demo"),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.transferred("scope://demo"),
    })
  })
})
