// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerFsInfoQuery } from "@/features/explorer/api/use-explorer-fs-info-query"

const apiMock = {
  explorer: {
    getFsInfo: vi.fn(),
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
    defaultOptions: { queries: { retry: false } },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerFsInfoQuery", () => {
  beforeEach(() => {
    apiMock.explorer.getFsInfo.mockReset()
  })

  it("uses the resolved remote name when provided", async () => {
    apiMock.explorer.getFsInfo.mockResolvedValue({ features: { PublicLink: true } })

    const { result } = renderHook(() => useExplorerFsInfoQuery("ignored", "demo"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.getFsInfo).toHaveBeenCalledWith({ remote: "demo", path: "" })
    expect(result.current.data).toEqual({ features: { PublicLink: true } })
  })
})
