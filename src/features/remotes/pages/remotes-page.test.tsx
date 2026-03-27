// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { RemotesPage } from "@/features/remotes/pages/remotes-page"
import { useExplorerStore } from "@/features/explorer/store/explorer-store"
import { renderWithProviders } from "@/test/render-with-providers"

const remotesQueryMock = vi.fn()
const remoteDetailQueryMock = vi.fn()
const remoteFsInfoQueryMock = vi.fn()
const cleanupMutationMock = vi.fn()
const appApiMock = vi.fn()

vi.mock("@/features/remotes/api/use-remotes-query", () => ({
  useRemotesQuery: () => remotesQueryMock(),
}))

vi.mock("@/features/remotes/api/use-remote-detail-query", () => ({
  useRemoteDetailQuery: (name: string | null) =>
    remoteDetailQueryMock(name ? name.split("::")[0] : null),
}))

vi.mock("@/features/explorer/api/use-explorer-fs-info-query", () => ({
  useExplorerFsInfoQuery: (queryRemote: string, remoteName?: string | null) =>
    remoteFsInfoQueryMock(remoteName ?? queryRemote),
}))

vi.mock("@/features/explorer/api/use-explorer-cleanup-mutation", () => ({
  useExplorerCleanupMutation: () => cleanupMutationMock(),
}))

vi.mock(import("@/shared/api/client/api-context"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    useAppApi: () => appApiMock(),
  }
})

describe("RemotesPage", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    useExplorerStore.getState().setScope("test-scope")
    useExplorerStore.setState({
      scopeKey: "test-scope",
      currentRemote: "old-remote",
      currentPath: "old/path",
    })

    remotesQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [
        {
          name: "demo",
          backend: "s3",
        },
      ],
    })

    remoteDetailQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: null,
    })

    remoteFsInfoQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: null,
    })

    cleanupMutationMock.mockReturnValue({
      isPending: false,
      mutateAsync: vi.fn(),
    })

    appApiMock.mockReturnValue({
      jobs: {
        get: vi.fn(),
      },
    })
  })

  it("writes selected remote into explorer store when browsing", () => {
    renderWithProviders(
      <MemoryRouter>
        <RemotesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Browse" }))

    expect(useExplorerStore.getState().currentRemote).toBe("demo")
    expect(useExplorerStore.getState().currentPath).toBe("")
  })

  it("renders remote detail after inspect is selected", () => {
    remoteDetailQueryMock.mockImplementation((name: string | null) => ({
      isLoading: false,
      error: null,
      data:
        name === "demo"
          ? {
              name: "demo",
              backend: "s3",
              config: {
                provider: "MinIO",
              },
            }
          : null,
    }))
    remoteFsInfoQueryMock.mockImplementation((remote: string) => ({
      isLoading: false,
      error: null,
      data:
        remote === "demo"
          ? {
              hashes: ["MD5", "SHA1"],
              features: {
                PublicLink: true,
                Move: true,
                Copy: true,
              },
            }
          : null,
    }))

    renderWithProviders(
      <MemoryRouter>
        <RemotesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Inspect" }))

    expect(screen.getAllByText("demo").length).toBeGreaterThan(0)
    expect(screen.getByText("s3")).not.toBeNull()
    expect(screen.getByText("Config JSON")).not.toBeNull()
    expect(screen.getByText(/"provider": "MinIO"/)).not.toBeNull()
  })
})
