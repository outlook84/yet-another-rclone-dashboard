// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useDeleteRemoteMutation } from "@/features/remotes/api/use-delete-remote-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { remotes: { delete: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useDeleteRemoteMutation", () => {
  beforeEach(() => apiMock.remotes.delete.mockReset())

  it("deletes a remote and invalidates list/detail queries", async () => {
    apiMock.remotes.delete.mockResolvedValue(undefined)
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useDeleteRemoteMutation(), { wrapper: createWrapper(queryClient) })
    result.current.mutate("demo")

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.remotes.delete).toHaveBeenCalledWith("demo")
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.remotes("scope://demo") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.remote("scope://demo", "demo") })
  })
})
