// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerBatchMutation } from "@/features/explorer/api/use-explorer-batch-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { jobs: { batch: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerBatchMutation", () => {
  beforeEach(() => apiMock.jobs.batch.mockReset())

  it("skips batch calls for empty input and still invalidates relevant queries", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")
    const { result } = renderHook(() => useExplorerBatchMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({ remote: "demo", currentPath: "docs", inputs: [] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.batch).not.toHaveBeenCalled()
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.explorer("scope://demo", "demo", "docs") })
  })

  it("executes batch calls when inputs are provided", async () => {
    apiMock.jobs.batch.mockResolvedValue([{ ok: true }])
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const { result } = renderHook(() => useExplorerBatchMutation(), { wrapper: createWrapper(queryClient) })

    result.current.mutate({ remote: "demo", currentPath: "docs", inputs: [{ _path: "operations/deletefile" }] })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.jobs.batch).toHaveBeenCalledWith([{ _path: "operations/deletefile" }])
  })
})
