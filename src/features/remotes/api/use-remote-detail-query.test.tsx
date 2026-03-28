// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useRemoteDetailQuery } from "@/features/remotes/api/use-remote-detail-query"

const apiMock = {
  remotes: {
    get: vi.fn(),
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

describe("useRemoteDetailQuery", () => {
  beforeEach(() => {
    apiMock.remotes.get.mockReset()
  })

  it("fetches remote detail when a name is provided", async () => {
    apiMock.remotes.get.mockResolvedValue({
      name: "demo",
      backend: "s3",
      config: { type: "s3" },
      source: "rclone-rc",
    })

    const { result } = renderHook(() => useRemoteDetailQuery("demo"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(apiMock.remotes.get).toHaveBeenCalledWith("demo")
    expect(result.current.data?.name).toBe("demo")
  })

  it("stays disabled when the remote name is missing", async () => {
    const { result } = renderHook(() => useRemoteDetailQuery(null), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"))
    expect(apiMock.remotes.get).not.toHaveBeenCalled()
  })
})
