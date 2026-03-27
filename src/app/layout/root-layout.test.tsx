// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom"
import { RootLayout } from "@/app/layout/root-layout"
import { AppProviders } from "@/app/providers/app-providers"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useLastVisitedRouteStore } from "@/shared/store/last-visited-route-store"

vi.mock("@/shared/hooks/use-connection-health-query", () => ({
  useConnectionHealthQuery: () => ({
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    isPending: false,
  }),
}))

function renderRootLayout(initialEntries: Array<string | { pathname: string; state?: unknown }>) {
  return render(
    <AppProviders>
      <MemoryRouter initialEntries={initialEntries}>
        <Routes>
          <Route path="/" element={<RootLayout />}>
            <Route index element={<div>Connect Screen</div>} />
            <Route path="overview" element={<div>Overview Screen</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AppProviders>,
  )
}

describe("RootLayout", () => {
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
      lastValidatedAt: "2026-03-26T07:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        version: "1.70.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })

    useLastVisitedRouteStore.setState({
      routeByScope: {
        "http://localhost:5572::basic::gui": "/overview",
      },
    })
  })

  it("restores the last visited route on initial load of connect", async () => {
    renderRootLayout(["/"])

    await waitFor(() => {
      expect(screen.getByText("Overview Screen")).not.toBeNull()
    })
  })

  it("does not auto-redirect away when connect is opened from navigation", async () => {
    renderRootLayout(["/overview"])

    fireEvent.click(screen.getByRole("link", { name: "Connect RC link" }))

    await waitFor(() => {
      expect(screen.getByText("Connect Screen")).not.toBeNull()
    })
  })

  it("does not auto-redirect away when connect is revisited with manual connect state", async () => {
    renderRootLayout([{ pathname: "/", state: { manualConnect: true } }])

    await waitFor(() => {
      expect(screen.getByText("Connect Screen")).not.toBeNull()
    })
  })
})
