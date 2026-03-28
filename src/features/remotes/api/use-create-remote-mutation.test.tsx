// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useCreateRemoteMutation } from "@/features/remotes/api/use-create-remote-mutation"
import { queryKeys } from "@/shared/lib/query-keys"

const apiMock = { remotes: { create: vi.fn() } }

vi.mock("@/shared/api/client/api-context", () => ({ useAppApi: () => apiMock }))
vi.mock("@/shared/hooks/use-connection-scope", () => ({ useConnectionScope: () => "scope://demo" }))

function createWrapper(queryClient: QueryClient) {
  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useCreateRemoteMutation", () => {
  beforeEach(() => apiMock.remotes.create.mockReset())

  it("creates a remote and invalidates list/detail queries", async () => {
    apiMock.remotes.create.mockResolvedValue({ name: "demo", backend: "s3", config: {}, source: "rclone-rc" })
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries")

    const { result } = renderHook(() => useCreateRemoteMutation(), { wrapper: createWrapper(queryClient) })
    result.current.mutate({ name: "demo", config: { type: "s3" } })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.remotes.create).toHaveBeenCalledWith({ name: "demo", config: { type: "s3" } })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.remotes("scope://demo") })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.remote("scope://demo", "demo") })
  })
})
