// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRemotesQuery } from "@/features/remotes/api/use-remotes-query"

const apiMock = {
  remotes: {
    list: vi.fn(),
  },
}

vi.mock("@/shared/api/client/api-context", () => ({
  useAppApi: () => apiMock,
}))

vi.mock("@/shared/hooks/use-connection-scope", () => ({
  useConnectionScope: () => "scope://demo",
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useRemotesQuery", () => {
  beforeEach(() => {
    apiMock.remotes.list.mockReset()
  })

  it("loads remotes when enabled", async () => {
    apiMock.remotes.list.mockResolvedValue([{ name: "demo", backend: "s3", status: "ready" }])

    const { result } = renderHook(() => useRemotesQuery(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiMock.remotes.list).toHaveBeenCalledTimes(1)
    expect(result.current.data).toEqual([{ name: "demo", backend: "s3", status: "ready" }])
  })

  it("does not fetch remotes when disabled", async () => {
    const { result } = renderHook(() => useRemotesQuery(false), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(apiMock.remotes.list).not.toHaveBeenCalled()
  })
})
