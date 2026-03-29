// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
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

    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
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

  it("initializes explorer scope before browsing on first visit", () => {
    useExplorerStore.setState({
      scopeKey: null,
      sessionsByScope: {},
      tabs: [],
      activeTabId: "",
      currentRemote: "",
      currentPath: "",
    })

    renderWithProviders(
      <MemoryRouter>
        <RemotesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Browse" }))

    const state = useExplorerStore.getState()
    expect(state.scopeKey).toBeTruthy()
    expect(state.currentRemote).toBe("demo")
    expect(state.currentPath).toBe("")
    expect(state.scopeKey ? state.sessionsByScope[state.scopeKey]?.currentRemote : "").toBe("demo")
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
                type: "s3",
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
    expect(screen.getByText("Remote JSON")).not.toBeNull()
    expect(screen.getByText(/"demo": \{/)).not.toBeNull()
    expect(screen.getByText(/"provider": "MinIO"/)).not.toBeNull()
  })

  it("disables updating when the dump entry name is changed", async () => {
    const demoRemoteDetail = {
      name: "demo",
      backend: "s3",
      config: {
        type: "s3",
        provider: "MinIO",
      },
    }

    remoteDetailQueryMock.mockImplementation((name: string | null) => ({
      isLoading: false,
      error: null,
      data: name === "demo" ? demoRemoteDetail : null,
    }))

    renderWithProviders(
      <MemoryRouter>
        <RemotesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Inspect" }))

    const editor = screen.getByDisplayValue(/"demo": \{/)
    fireEvent.change(editor, {
      target: {
        value: JSON.stringify(
          {
            renamed: {
              provider: "MinIO",
            },
          },
          null,
          2,
        ),
      },
    })

    await waitFor(() => {
      expect((screen.getByRole("button", { name: "Update Remote" }) as HTMLButtonElement).disabled).toBe(true)
    })
  })

  it("accepts renamed dump entry JSON in import flow", async () => {
    const demoRemoteDetail = {
      name: "demo",
      backend: "s3",
      config: {
        type: "s3",
        provider: "MinIO",
      },
    }

    remoteDetailQueryMock.mockImplementation((name: string | null) => ({
      isLoading: false,
      error: null,
      data: name === "demo" ? demoRemoteDetail : null,
    }))

    renderWithProviders(
      <MemoryRouter>
        <RemotesPage />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole("button", { name: "Inspect" }))

    const renamedDumpEntry = JSON.stringify(
      {
        renamed: {
          type: "s3",
          provider: "MinIO",
        },
      },
      null,
      2,
    )

    fireEvent.click(screen.getByRole("button", { name: "Import Config JSON" }))

    await waitFor(() => {
      expect(screen.getByText("Import JSON")).not.toBeNull()
    })

    const editors = screen.getAllByRole("textbox")
    const importEditor = editors[editors.length - 1]

    fireEvent.change(importEditor, {
      target: {
        value: renamedDumpEntry,
      },
    })

    await waitFor(() => {
      expect(screen.getByText("Importable: 1")).not.toBeNull()
    })

    expect((screen.getByRole("button", { name: "Import Missing Remotes" }) as HTMLButtonElement).disabled).toBe(false)
  })
})
