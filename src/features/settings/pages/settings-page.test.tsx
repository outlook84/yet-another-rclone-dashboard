// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SettingsPage } from "@/features/settings/pages/settings-page"
import { useConnectionStore } from "@/shared/store/connection-store"
import { renderWithProviders } from "@/test/render-with-providers"

const appApiMock = vi.fn()
const getMock = vi.fn()
const updateMock = vi.fn()

vi.mock(import("@/shared/api/client/api-context"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    useAppApi: () => appApiMock(),
  }
})

const settingsByScope = {
  "http://localhost:5572::basic::alpha": {
    logLevel: "INFO",
    bandwidthLimit: "alpha-limit",
    transfers: 4,
    checkers: 8,
    timeout: "5m",
    connectTimeout: "30s",
    retries: 3,
    lowLevelRetries: 10,
  },
  "http://localhost:5573::basic::bravo": {
    logLevel: "NOTICE",
    bandwidthLimit: "bravo-limit",
    transfers: 2,
    checkers: 6,
    timeout: "2m",
    connectTimeout: "15s",
    retries: 5,
    lowLevelRetries: 7,
  },
} as const

function setConnection(baseUrl: string, username: string) {
  useConnectionStore.setState({
    baseUrl,
    authMode: "basic",
    basicCredentials: {
      username,
      password: "secret",
    },
    lastValidatedAt: "2026-03-26T07:00:00.000Z",
    lastServerInfo: {
      product: "rclone",
      version: "1.70.0",
      apiBaseUrl: baseUrl,
    },
  })
}

function getCurrentScope() {
  const state = useConnectionStore.getState()
  const endpoint = state.lastServerInfo?.apiBaseUrl ?? state.baseUrl
  return `${endpoint}::${state.authMode}::${state.basicCredentials.username}`
}

function expectAllSaveButtonsDisabled(disabled: boolean) {
  const buttons = screen.getAllByRole("button", { name: "Save" })
  expect(buttons.length).toBeGreaterThan(0)

  for (const button of buttons) {
    expect((button as HTMLButtonElement).disabled).toBe(disabled)
  }
}

describe("SettingsPage", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    getMock.mockReset()
    updateMock.mockReset()
    setConnection("http://localhost:5572", "alpha")

    getMock.mockImplementation(async () => settingsByScope[getCurrentScope() as keyof typeof settingsByScope])
    appApiMock.mockReturnValue({
      settings: {
        get: getMock,
        update: updateMock,
      },
    })
  })

  it("does not reuse unsaved draft values after switching connection scope", async () => {
    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("alpha-limit")).not.toBeNull()
    })

    fireEvent.change(screen.getByDisplayValue("alpha-limit"), {
      target: { value: "alpha-draft" },
    })

    expect(screen.getByDisplayValue("alpha-draft")).not.toBeNull()
    expectAllSaveButtonsDisabled(false)

    setConnection("http://localhost:5573", "bravo")

    await waitFor(() => {
      expect(screen.getByDisplayValue("bravo-limit")).not.toBeNull()
    })

    expect(screen.queryByDisplayValue("alpha-draft")).toBeNull()
    expectAllSaveButtonsDisabled(true)
  })

  it("keeps the saved value visible after save succeeds before refetch completes", async () => {
    getMock
      .mockResolvedValueOnce(settingsByScope["http://localhost:5572::basic::alpha"])
      .mockImplementationOnce(
        () =>
          new Promise<never>(() => {
            // Keep the refetch pending so the test observes the post-save UI state.
          }),
      )

    renderWithProviders(<SettingsPage />)

    await waitFor(() => {
      expect(screen.getByDisplayValue("alpha-limit")).not.toBeNull()
    })

    fireEvent.change(screen.getByDisplayValue("alpha-limit"), {
      target: { value: "saved-limit" },
    })

    fireEvent.click(screen.getAllByRole("button", { name: "Save" })[0])

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledWith({ bandwidthLimit: "saved-limit" })
    })

    expect(screen.getByDisplayValue("saved-limit")).not.toBeNull()
    expect(screen.queryByDisplayValue("alpha-limit")).toBeNull()
    expectAllSaveButtonsDisabled(true)
  })
})
