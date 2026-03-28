// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerCopyFileMutation } from "@/features/explorer/api/use-explorer-copy-file-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { explorer: { copyFile: vi.fn() }, jobs: { batch: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerCopyFileMutation", () => {
  beforeEach(() => {
    apiMock.explorer.copyFile.mockReset()
    apiMock.jobs.batch.mockReset()
  })

  it("copies a single file through explorer api", async () => {
    apiMock.explorer.copyFile.mockResolvedValue({ jobId: 1 })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const refetchSpy = vi.spyOn(queryClient, "refetchQueries")
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useExplorerCopyFileMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({
      srcRemote: "src",
      dstRemote: "dst",
      currentPath: "docs",
      items: [{ srcPath: "a.txt", dstPath: "b.txt" }],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.copyFile).toHaveBeenCalledWith({
      src: { remote: "src", path: "a.txt" },
      dst: { remote: "dst", path: "b.txt" },
    })
    expect(refetchSpy).toHaveBeenCalledWith({ queryKey: queryKeys.jobs("scope://demo") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.stats("scope://demo") })
  })

  it("copies multiple files through batch api", async () => {
    apiMock.jobs.batch.mockResolvedValue([])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerCopyFileMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({
      srcRemote: "src",
      dstRemote: "dst",
      currentPath: "docs",
      items: [
        { srcPath: "a.txt", dstPath: "b.txt" },
        { srcPath: "c.txt", dstPath: "d.txt" },
      ],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.batch).toHaveBeenCalledWith([
      { _path: "operations/copyfile", srcFs: "src:", srcRemote: "a.txt", dstFs: "dst:", dstRemote: "b.txt" },
      { _path: "operations/copyfile", srcFs: "src:", srcRemote: "c.txt", dstFs: "dst:", dstRemote: "d.txt" },
    ])
  })
})
