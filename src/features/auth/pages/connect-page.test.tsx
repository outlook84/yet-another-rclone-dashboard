// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConnectPage } from "@/features/auth/pages/connect-page"
import { useConnectionStore } from "@/shared/store/connection-store"
import { renderWithProviders } from "@/test/render-with-providers"

const pingMock = vi.fn()
const serverInfoMock = vi.fn()
const createClientMock = vi.fn()

vi.mock("@/shared/api/client/app-api-client", () => ({
  createRcloneRcAppApiClient: (...args: unknown[]) => createClientMock(...args),
}))

describe("ConnectPage", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
    })

    pingMock.mockResolvedValue({
      latencyMs: 12,
    })

    serverInfoMock.mockResolvedValue({
      product: "rclone",
      version: "1.70.0",
      apiBaseUrl: "http://localhost:5572",
    })

    createClientMock.mockReturnValue({
      session: {
        ping: pingMock,
        getServerInfo: serverInfoMock,
      },
    })
  })

  it("validates connection and renders server info", async () => {
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

    await waitFor(() => {
      expect(screen.getByText("Connection Ready")).not.toBeNull()
      expect(screen.getByText("rclone responded in 12 ms.")).not.toBeNull()
    })
  })

  it("shows error notification when validation fails", async () => {
    pingMock.mockRejectedValue(new Error("rc endpoint unavailable"))

    renderWithProviders(<ConnectPage />)

    fireEvent.click(screen.getByRole("button", { name: "Validate Connection" }))

    await waitFor(() => {
      expect(screen.getByText("Connection Failed")).not.toBeNull()
      expect(screen.getByText("rc endpoint unavailable")).not.toBeNull()
    })
  })
})
