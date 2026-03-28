// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerDeleteFileMutation } from "@/features/explorer/api/use-explorer-delete-file-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = {
  explorer: {
    deleteFile: vi.fn(),
  },
  jobs: {
    batch: vi.fn(),
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

describe("useExplorerDeleteFileMutation", () => {
  beforeEach(() => {
    apiMock.explorer.deleteFile.mockReset()
    apiMock.jobs.batch.mockReset()
  })

  it("deletes a single file through the explorer api and invalidates related queries", async () => {
    apiMock.explorer.deleteFile.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useExplorerDeleteFileMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({
      remote: "demo",
      currentPath: "docs",
      targetPaths: ["docs/readme.md"],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiMock.explorer.deleteFile).toHaveBeenCalledWith({
      remote: "demo",
      path: "docs/readme.md",
    })
    expect(apiMock.jobs.batch).not.toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: queryKeys.explorer("scope://demo", "demo", "docs"),
    })
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: [...queryKeys.explorer("scope://demo", "demo", ""), "usage"],
    })
  })

  it("uses batch deletion when multiple target paths are provided", async () => {
    apiMock.jobs.batch.mockResolvedValue(undefined)
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    })

    const { result } = renderHook(() => useExplorerDeleteFileMutation(), {
      wrapper: createWrapper(queryClient),
    })

    result.current.mutate({
      remote: "demo",
      currentPath: "docs",
      targetPaths: ["a.txt", "b.txt"],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiMock.jobs.batch).toHaveBeenCalledWith([
      { _path: "operations/deletefile", fs: "demo:", remote: "a.txt" },
      { _path: "operations/deletefile", fs: "demo:", remote: "b.txt" },
    ])
    expect(apiMock.explorer.deleteFile).not.toHaveBeenCalled()
  })
})
