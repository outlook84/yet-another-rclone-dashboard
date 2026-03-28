// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerMoveFileMutation } from "@/features/explorer/api/use-explorer-move-file-mutation"

const apiMock = { explorer: { moveFile: vi.fn() }, jobs: { batch: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerMoveFileMutation", () => {
  beforeEach(() => {
    apiMock.explorer.moveFile.mockReset()
    apiMock.jobs.batch.mockReset()
  })

  it("moves a single file through explorer api", async () => {
    apiMock.explorer.moveFile.mockResolvedValue({ jobId: 1 })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerMoveFileMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({
      srcRemote: "src",
      dstRemote: "dst",
      currentPath: "docs",
      items: [{ srcPath: "a.txt", dstPath: "b.txt" }],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.moveFile).toHaveBeenCalledWith({
      src: { remote: "src", path: "a.txt" },
      dst: { remote: "dst", path: "b.txt" },
    })
  })

  it("moves multiple files through batch api", async () => {
    apiMock.jobs.batch.mockResolvedValue([])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerMoveFileMutation(), { wrapper: createWrapper(queryClient) })

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
      { _path: "operations/movefile", srcFs: "src:", srcRemote: "a.txt", dstFs: "dst:", dstRemote: "b.txt" },
      { _path: "operations/movefile", srcFs: "src:", srcRemote: "c.txt", dstFs: "dst:", dstRemote: "d.txt" },
    ])
  })
})
