// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react"
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
    createClientMock.mockReset()
    removeQueriesMock.mockReset()
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      syncEnabled: false,
      uploadEnabled: false,
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 0,
    })
    useSavedConnectionsStore.setState({
      profiles: [],
      activeProfileId: null,
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

  it("validates the current draft and updates runtime connection state", async () => {
    const pingMock = vi.fn().mockResolvedValue({
      latencyMs: 12,
    })
    const serverInfoMock = vi.fn().mockResolvedValue({
      product: "rclone",
      version: "1.70.0",
      apiBaseUrl: "http://localhost:5572",
    })
    createClientMock.mockImplementation(({ authMode }: { authMode: string }) => ({
      session: {
        ping: authMode === "none"
          ? vi.fn().mockRejectedValue(new UnknownApiError("auth required", { code: "api_error", status: 401 }))
          : pingMock,
        getServerInfo: authMode === "none" ? vi.fn() : serverInfoMock,
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable Upload" }))
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm" }))

    await waitFor(() => {
      expect((screen.getByRole("checkbox", { name: "Enable Upload" }) as HTMLInputElement).checked).toBe(true)
    })

    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
      expect(screen.getByText("rclone responded in 12 ms.")).not.toBeNull()
    })

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      uploadEnabled: true,
      lastValidatedAt: expect.any(String),
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["scope", "http://localhost:5572::basic::gui"],
    })
    expect(removeQueriesMock).toHaveBeenCalledWith({
      queryKey: ["connection-health"],
    })
    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreview).toBeNull()
  })

  it("initializes the selected draft from the active saved profile", async () => {
    const pingMock = vi.fn()
    const serverInfoMock = vi.fn()
    createClientMock.mockReturnValue({
      session: {
        ping: pingMock,
        getServerInfo: serverInfoMock,
      },
    })

    useConnectionStore.setState({
      baseUrl: "https://demo.example.com/rc",
      authMode: "basic",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
      syncEnabled: true,
      uploadEnabled: false,
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Demo Profile",
          baseUrl: "https://demo.example.com/rc",
          authMode: "basic",
          basicCredentials: {
            username: "demo",
            password: "pw",
          },
          syncEnabled: true,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      activeProfileId: "profile-1",
    })

    renderWithProviders(<ConnectPage />)

    await waitFor(() => {
      expect((screen.getByRole("combobox", { name: "Saved Connections" }) as HTMLSelectElement).value).toBe("profile-1")
    })
    expect(screen.getByDisplayValue("https://demo.example.com/rc")).not.toBeNull()
    expect((screen.getByRole("checkbox", { name: "Enable Sync" }) as HTMLInputElement).checked).toBe(true)
    expect(pingMock).not.toHaveBeenCalled()
    expect(serverInfoMock).not.toHaveBeenCalled()
  })

  it("fills the base URL from the current dashboard URL", () => {
    window.history.replaceState({}, "", "/dashboard/index.html#/connect")

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Use current URL" }))

    expect(screen.getByDisplayValue("http://localhost:3000/dashboard")).not.toBeNull()
  })

  it("saves and connects the selected profile after validation", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Template",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      activeProfileId: "profile-1",
    })

    createClientMock.mockImplementation(({ authMode }: { authMode: string }) => ({
      session: {
        ping: authMode === "none"
          ? vi.fn().mockRejectedValue(new UnknownApiError("auth required", { code: "api_error", status: 401 }))
          : vi.fn().mockResolvedValue({
              latencyMs: 8,
            }),
        getServerInfo: authMode === "none"
          ? vi.fn()
          : vi.fn().mockResolvedValue({
              product: "rclone",
              version: "1.70.0",
              apiBaseUrl: "http://localhost:5572",
            }),
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "profile-1" },
    })
    fireEvent.change(screen.getByDisplayValue("http://localhost:5572"), {
      target: { value: "http://localhost:5573" },
    })
    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })

    await waitFor(() => {
      expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
        id: "profile-1",
        baseUrl: "http://localhost:5573",
        syncEnabled: true,
      })
    })
    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "http://localhost:5573",
      authMode: "basic",
      syncEnabled: true,
      uploadEnabled: false,
      lastValidatedAt: expect.any(String),
    })
  })

  it("does not auto-connect partially edited saved drafts", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Template",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      activeProfileId: "profile-1",
    })

    createClientMock.mockImplementation(({ authMode }: { authMode: string }) => ({
      session: {
        ping: authMode === "none"
          ? vi.fn().mockRejectedValue(new UnknownApiError("auth required", { code: "api_error", status: 401 }))
          : vi.fn().mockResolvedValue({
              latencyMs: 8,
            }),
        getServerInfo: authMode === "none"
          ? vi.fn()
          : vi.fn().mockResolvedValue({
              product: "rclone",
              version: "1.70.0",
              apiBaseUrl: "http://localhost:5572",
            }),
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "profile-1" },
    })

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })
    createClientMock.mockClear()

    fireEvent.change(screen.getByDisplayValue("http://localhost:5572"), {
      target: { value: "http://localhost:5573" },
    })

    expect(createClientMock).not.toHaveBeenCalled()
    expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
      id: "profile-1",
      baseUrl: "http://localhost:5572",
    })
  })

  it("seeds the connect form from runtime state instead of the active saved profile", () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Template",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      activeProfileId: "profile-1",
    })
    useConnectionStore.setState({
      baseUrl: "http://localhost:5573",
      authMode: "none",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      syncEnabled: false,
      uploadEnabled: true,
      lastValidatedAt: "2026-03-29T00:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://localhost:5573",
      },
    })

    renderWithProviders(<ConnectPage />)

    expect(screen.getByDisplayValue("http://localhost:5573")).not.toBeNull()
    expect((screen.getAllByRole("combobox")[0] as HTMLSelectElement).value).toBe("")
    expect((screen.getByRole("checkbox", { name: "Enable Sync" }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole("checkbox", { name: "Enable Upload" }) as HTMLInputElement).checked).toBe(true)
  })

  it("connects automatically when switching saved profiles", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-5",
          name: "Template",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          uploadEnabled: true,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
        {
          id: "profile-6",
          name: "Backup",
          baseUrl: "https://backup.example.com/rc",
          authMode: "none",
          basicCredentials: {
            username: "",
            password: "",
          },
          syncEnabled: false,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      activeProfileId: "profile-5",
    })
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      syncEnabled: true,
      uploadEnabled: true,
      lastValidatedAt: "2026-03-29T00:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockResolvedValue({
          latencyMs: 12,
        }),
        getServerInfo: vi.fn().mockResolvedValue({
          product: "rclone",
          version: "1.70.0",
          apiBaseUrl: "https://backup.example.com/rc",
        }),
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "profile-6" },
    })

    expect(screen.getByDisplayValue("https://backup.example.com/rc")).not.toBeNull()
    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
      expect(useSavedConnectionsStore.getState().activeProfileId).toBe("profile-6")
      expect(useConnectionStore.getState()).toMatchObject({
        baseUrl: "https://backup.example.com/rc",
        authMode: "none",
        syncEnabled: false,
        uploadEnabled: false,
        lastValidatedAt: expect.any(String),
      })
    })
  })

  it("clears the validation banner when switching saved drafts", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "profile-1",
          name: "Template",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: {
            username: "gui",
            password: "secret",
          },
          syncEnabled: true,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
        {
          id: "profile-2",
          name: "Backup",
          baseUrl: "https://backup.example.com/rc",
          authMode: "none",
          basicCredentials: {
            username: "",
            password: "",
          },
          syncEnabled: false,
          uploadEnabled: false,
          updatedAt: "2026-03-29T00:00:00.000Z",
        },
      ],
      activeProfileId: "profile-1",
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
          ping: vi.fn().mockResolvedValue({
            latencyMs: 12,
          }),
          getServerInfo: vi.fn().mockResolvedValue({
            product: "rclone",
            version: "1.70.0",
            apiBaseUrl: "http://localhost:5572",
          }),
        },
      }
    })

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })

    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "profile-2" },
    })

    expect(screen.queryByText("Connection Ready")).toBeNull()
    expect(screen.queryByText("rclone responded in 12 ms.")).toBeNull()
  })

  it("clears the validation banner when editing the current draft", async () => {
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
          ping: vi.fn().mockResolvedValue({
            latencyMs: 12,
          }),
          getServerInfo: vi.fn().mockResolvedValue({
            product: "rclone",
            version: "1.70.0",
            apiBaseUrl: "http://localhost:5572",
          }),
        },
      }
    })

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })

    fireEvent.change(screen.getByDisplayValue("http://localhost:5572"), {
      target: { value: "http://localhost:5573" },
    })

    expect(screen.queryByText("Connection Ready")).toBeNull()
    expect(screen.queryByText("rclone responded in 12 ms.")).toBeNull()
  })

  it("saves and connects the current draft as a new profile", async () => {
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      syncEnabled: false,
      uploadEnabled: true,
      lastValidatedAt: "2026-03-29T00:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://localhost:5572",
      },
      validationRevision: 1,
    })

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("checkbox", { name: "Enable Sync" }))
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Confirm" }))

    await waitFor(() => {
      expect((screen.getByRole("checkbox", { name: "Enable Sync" }) as HTMLInputElement).checked).toBe(true)
    })

    createClientMock.mockImplementation(({ authMode }: { authMode: string }) => ({
      session: {
        ping: authMode === "none"
          ? vi.fn().mockRejectedValue(new UnknownApiError("auth required", { code: "api_error", status: 401 }))
          : vi.fn().mockResolvedValue({
              latencyMs: 12,
            }),
        getServerInfo: authMode === "none"
          ? vi.fn()
          : vi.fn().mockResolvedValue({
              product: "rclone",
              version: "1.70.0",
              apiBaseUrl: "http://localhost:5572",
            }),
      },
    }))

    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
        syncEnabled: true,
        uploadEnabled: true,
      })
    })
    expect(useSavedConnectionsStore.getState().activeProfileId).toBe(useSavedConnectionsStore.getState().profiles[0]?.id)
    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      syncEnabled: true,
      uploadEnabled: true,
      lastValidatedAt: expect.any(String),
      validationRevision: 2,
    })
  })

  it("disables saving while connection validation is pending", async () => {
    let resolvePing: ((value: { latencyMs: number }) => void) | null = null
    let resolveServerInfo: ((value: {
      product: string
      version: string
      apiBaseUrl: string
    }) => void) | null = null

    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockImplementation(() => new Promise<{ latencyMs: number }>((resolve) => {
          resolvePing = resolve
        })),
        getServerInfo: vi.fn().mockImplementation(() => new Promise<{
          product: string
          version: string
          apiBaseUrl: string
        }>((resolve) => {
          resolveServerInfo = resolve
        })),
      },
    }))

    renderWithProviders(<ConnectPage />)

    const saveButton = screen.getByRole("button", { name: "Save & Connect" })
    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(saveButton.hasAttribute("disabled")).toBe(true)
    })

    fireEvent.click(saveButton)
    expect(useSavedConnectionsStore.getState().profiles).toEqual([])

    expect(resolvePing).not.toBeNull()
    expect(resolveServerInfo).not.toBeNull()

    resolvePing!({ latencyMs: 12 })
    resolveServerInfo!({
      product: "rclone",
      version: "1.70.0",
      apiBaseUrl: "http://localhost:5572",
    })

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
    })
  })

  it("shows error feedback when validation fails", async () => {
    createClientMock.mockImplementation(() => ({
      session: {
        ping: vi.fn().mockRejectedValue(new Error("rc endpoint unavailable")),
        getServerInfo: vi.fn(),
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Failed")).not.toBeNull()
      expect(screen.getByText("rc endpoint unavailable")).not.toBeNull()
    })
  })

  it("detects no-auth mode when saving a basic-auth draft", async () => {
    createClientMock.mockImplementation(({ authMode }: { authMode: string }) => ({
      session: {
        ping: vi.fn().mockResolvedValue({
          latencyMs: authMode === "none" ? 7 : 12,
        }),
        getServerInfo: vi.fn().mockResolvedValue({
          product: "rclone",
          version: "1.70.0",
          apiBaseUrl: "http://localhost:5572",
        }),
      },
    }))

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Save & Connect" }))

    await waitFor(() => {
      expect(useConnectionStore.getState()).toMatchObject({
        authMode: "none",
        lastValidatedAt: expect.any(String),
      })
    })
    expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
      authMode: "none",
    })
    expect(createClientMock).toHaveBeenCalledWith(expect.objectContaining({
      authMode: "none",
    }))
  })
})


