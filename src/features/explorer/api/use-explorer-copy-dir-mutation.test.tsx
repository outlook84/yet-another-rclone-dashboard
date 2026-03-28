// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerCopyDirMutation } from "@/features/explorer/api/use-explorer-copy-dir-mutation"

const apiMock = { explorer: { copyDir: vi.fn() }, jobs: { batch: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerCopyDirMutation", () => {
  beforeEach(() => {
    apiMock.explorer.copyDir.mockReset()
    apiMock.jobs.batch.mockReset()
  })

  it("returns early for empty dir copy input", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerCopyDirMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({ srcRemote: "src", dstRemote: "dst", currentPath: "docs", items: [] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.copyDir).not.toHaveBeenCalled()
    expect(apiMock.jobs.batch).not.toHaveBeenCalled()
  })

  it("uses batch for multiple directory copies", async () => {
    apiMock.jobs.batch.mockResolvedValue([])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerCopyDirMutation(), { wrapper: createWrapper(queryClient) })

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
      { _path: "sync/copy", _async: true, srcFs: "src:a", dstFs: "dst:b" },
      { _path: "sync/copy", _async: true, srcFs: "src:c", dstFs: "dst:d" },
    ])
  })
})
