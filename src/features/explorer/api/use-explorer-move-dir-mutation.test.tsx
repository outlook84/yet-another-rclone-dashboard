// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerMoveDirMutation } from "@/features/explorer/api/use-explorer-move-dir-mutation"

const apiMock = { explorer: { moveDir: vi.fn() }, jobs: { batch: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerMoveDirMutation", () => {
  beforeEach(() => {
    apiMock.explorer.moveDir.mockReset()
    apiMock.jobs.batch.mockReset()
  })

  it("moves a single directory through explorer api", async () => {
    apiMock.explorer.moveDir.mockResolvedValue({ jobId: 1 })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerMoveDirMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({
      srcRemote: "src",
      dstRemote: "dst",
      currentPath: "docs",
      items: [{ srcPath: "a", dstPath: "b" }],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.moveDir).toHaveBeenCalledWith({
      src: { remote: "src", path: "a" },
      dst: { remote: "dst", path: "b" },
    })
  })

  it("moves multiple directories through batch api", async () => {
    apiMock.jobs.batch.mockResolvedValue([])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerMoveDirMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({
      srcRemote: "src",
      dstRemote: "dst",
      currentPath: "docs",
      items: [
        { srcPath: "a", dstPath: "b" },
        { srcPath: "c", dstPath: "d" },
      ],
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.batch).toHaveBeenCalledWith([
      { _path: "sync/move", _async: true, srcFs: "src:a", dstFs: "dst:b" },
      { _path: "sync/move", _async: true, srcFs: "src:c", dstFs: "dst:d" },
    ])
  })
})
