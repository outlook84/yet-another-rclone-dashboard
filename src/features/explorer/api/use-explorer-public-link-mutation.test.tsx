// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import type { PropsWithChildren } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useExplorerPublicLinkMutation } from "@/features/explorer/api/use-explorer-public-link-mutation"

const apiMock = {
  explorer: {
    publicLink: vi.fn(),
  },
}

vi.mock("@/shared/api/client/api-context", () => ({
  useAppApi: () => apiMock,
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  }
}

describe("useExplorerPublicLinkMutation", () => {
  beforeEach(() => {
    apiMock.explorer.publicLink.mockReset()
  })

  it("returns the generated public link", async () => {
    apiMock.explorer.publicLink.mockResolvedValue({ url: "https://example.com/share" })

    const { result } = renderHook(() => useExplorerPublicLinkMutation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ remote: "demo", path: "docs/readme.md" })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(apiMock.explorer.publicLink).toHaveBeenCalledWith({
      remote: "demo",
      path: "docs/readme.md",
    })
    expect(result.current.data).toEqual({ url: "https://example.com/share" })
  })

  it("fails when the backend adapter does not support public links", async () => {
    apiMock.explorer.publicLink = undefined as unknown as typeof apiMock.explorer.publicLink

    const { result } = renderHook(() => useExplorerPublicLinkMutation(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ remote: "demo", path: "docs/readme.md" })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(String(result.current.error)).toContain("Share link is not available")
  })
})
