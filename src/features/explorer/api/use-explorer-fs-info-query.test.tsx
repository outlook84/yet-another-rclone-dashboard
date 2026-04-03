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

type CacheTimingOptions = {
  staleTime?: number
  gcTime?: number
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

  it("configures a long-lived fs info cache", async () => {
    apiMock.explorer.getFsInfo.mockResolvedValue({ features: { About: true } })
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    )

    renderHook(() => useExplorerFsInfoQuery("demo"), { wrapper })

    await waitFor(() => expect(apiMock.explorer.getFsInfo).toHaveBeenCalledWith({ remote: "demo", path: "" }))

    const query = queryClient.getQueryCache().find({ queryKey: ["scope", "scope://demo", "explorer", "demo", "", "fsinfo"] })
    const options = query?.options as CacheTimingOptions | undefined

    expect(options?.staleTime).toBe(60 * 60 * 1000)
    expect(options?.gcTime).toBe(2 * 60 * 60 * 1000)
  })
})
