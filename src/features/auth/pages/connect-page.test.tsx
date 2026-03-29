// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConnectPage } from "@/features/auth/pages/connect-page"
import { useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { UnknownApiError } from "@/shared/api/contracts/errors"
import { useConnectionStore } from "@/shared/store/connection-store"
import { renderWithProviders } from "@/test/render-with-providers"

const createClientMock = vi.fn()
const removeQueriesMock = vi.fn()

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return {
    ...actual,
    useQueryClient: () => ({
      removeQueries: removeQueriesMock,
    }),
  }
})

vi.mock("@/shared/api/client/app-api-client", () => ({
  createRcloneRcAppApiClient: (...args: unknown[]) => createClientMock(...args),
}))

describe("ConnectPage", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    removeQueriesMock.mockReset()
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [],
      selectedProfileId: null,
    })
    useExplorerUIStore.setState({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
    })
    useExplorerUIStore.getState().setScope("http://localhost:5572::basic::gui")
    useExplorerUIStore.getState().setMediaPreview({
      fileName: "clip.mp4",
      kind: "video",
      layout: "video-landscape",
      path: "folder/clip.mp4",
      url: "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    })
  })

  it("validates connection and renders server info", async () => {
    const pingMock = vi.fn().mockResolvedValue({
      latencyMs: 12,
    })
    const serverInfoMock = vi.fn().mockResolvedValue({
      product: "rclone",
      version: "1.70.0",
      apiBaseUrl: "http://localhost:5572",
    })
    createClientMock.mockImplementation(({ authMode }: { authMode: string }) => {
      if (authMode === "none") {
        return {
          session: {
            ping: vi.fn().mockRejectedValue(new UnknownApiError("auth required", { code: "api_error", status: 401 })),
            getServerInfo: vi.fn(),
          },
        }
      }

      return {
        session: {
          ping: pingMock,
          getServerInfo: serverInfoMock,
        },
      }
    })

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }))

    await waitFor(() => {
      expect(createClientMock).toHaveBeenCalledWith({
        baseUrl: "http://localhost:5572",
        authMode: "basic",
        basicCredentials: {
          username: "gui",
          password: "secret",
        },
      })
    })
    expect(createClientMock).toHaveBeenCalledWith({
      baseUrl: "http://localhost:5572",
      authMode: "none",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
    })

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
      expect(screen.getByText("rclone responded in 12 ms.")).not.toBeNull()
    })
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["scope", "http://localhost:5572::basic::gui"],
    })
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["connection-health"],
    })
    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreview).toBeNull()
  })

  it("corrects the connection auth mode to none when the backend accepts anonymous access", async () => {
    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockResolvedValue({
          latencyMs: 8,
        }),
        getServerInfo: vi.fn().mockResolvedValue({
          product: "rclone",
          version: "1.70.0",
          apiBaseUrl: "http://localhost:5572",
        }),
      },
    }))

    renderWithProviders(<ConnectPage />)
    createClientMock.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })

    expect(createClientMock).toHaveBeenCalledWith({
      baseUrl: "http://localhost:5572",
      authMode: "none",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
    })
    expect(createClientMock).not.toHaveBeenCalledWith({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
    })
    expect(useConnectionStore.getState().authMode).toBe("none")
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["scope", "http://localhost:5572::none::anonymous"],
    })
  })

  it("rewrites the selected saved connection auth mode after validation detects anonymous access", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "localhost:5572 (gui)",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      selectedProfileId: "profile-1",
    })

    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockResolvedValue({
          latencyMs: 8,
        }),
        getServerInfo: vi.fn().mockResolvedValue({
          product: "rclone",
          version: "1.70.0",
          apiBaseUrl: "http://localhost:5572",
        }),
      },
    }))

    renderWithProviders(<ConnectPage />)
    createClientMock.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })

    expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
      id: "profile-1",
      name: "localhost:5572",
      baseUrl: "http://localhost:5572",
      authMode: "none",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      syncEnabled: true,
    })
  })

  it("keeps a custom saved connection name while correcting the auth mode", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-2",
          name: "Office Rclone",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      selectedProfileId: "profile-2",
    })

    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockResolvedValue({
          latencyMs: 8,
        }),
        getServerInfo: vi.fn().mockResolvedValue({
          product: "rclone",
          version: "1.70.0",
          apiBaseUrl: "http://localhost:5572",
        }),
      },
    }))

    renderWithProviders(<ConnectPage />)
    createClientMock.mockClear()

    fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })

    expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
      id: "profile-2",
      name: "Office Rclone",
      authMode: "none",
    })
  })

  it("shows error notification when validation fails", async () => {
    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockRejectedValue(new Error("rc endpoint unavailable")),
        getServerInfo: vi.fn(),
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Failed")).not.toBeNull()
      expect(screen.getByText("rc endpoint unavailable")).not.toBeNull()
    })
  })
})
