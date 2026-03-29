// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  MemoryRouter,
  Route,
  Routes,
} from "react-router-dom"
import { RootLayout } from "@/app/layout/root-layout"
import { AppProviders } from "@/app/providers/app-providers"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { useConnectionStore } from "@/shared/store/connection-store"
import { useLastVisitedRouteStore } from "@/shared/store/last-visited-route-store"

const { connectionHealthQueryMock } = vi.hoisted(() => ({
  connectionHealthQueryMock: {
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    isPending: false,
  },
}))

const { activeStatsFetchesMock } = vi.hoisted(() => ({
  activeStatsFetchesMock: {
    value: 0,
  },
}))

vi.mock("@tanstack/react-query", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tanstack/react-query")>()
  return {
    ...actual,
    useIsFetching: () => activeStatsFetchesMock.value,
  }
})

vi.mock("@/shared/hooks/use-connection-health-query", () => ({
  useConnectionHealthQuery: () => connectionHealthQueryMock,
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

function seedMediaPreview() {
  useExplorerUIStore.getState().setScope("http://localhost:5572::basic::gui")
  useExplorerUIStore.getState().setMediaPreview({
    fileName: "clip.mp4",
    kind: "video",
    layout: "video-landscape",
    path: "folder/clip.mp4",
    url: "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
  })
}

describe("RootLayout", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  beforeEach(() => {
    activeStatsFetchesMock.value = 0
    connectionHealthQueryMock.dataUpdatedAt = 0
    connectionHealthQueryMock.errorUpdatedAt = 0
    connectionHealthQueryMock.isPending = false
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
    useExplorerUIStore.setState({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
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

  it("shows the retry badge after a new connection health error", async () => {
    const view = renderRootLayout(["/overview"])

    connectionHealthQueryMock.errorUpdatedAt = 1

    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await waitFor(() => {
      expect(screen.getByText("Retrying (1/3)")).not.toBeNull()
    })
  })

  it("counts rapid consecutive connection health errors without dropping increments", async () => {
    const view = renderRootLayout(["/overview"])

    connectionHealthQueryMock.errorUpdatedAt = 1
    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    connectionHealthQueryMock.errorUpdatedAt = 2
    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await waitFor(() => {
      expect(screen.getByText("Retrying (2/3)")).not.toBeNull()
    })
  })

  it("resets the retry badge after a new successful health check", async () => {
    const view = renderRootLayout(["/overview"])

    connectionHealthQueryMock.errorUpdatedAt = 1

    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await waitFor(() => {
      expect(screen.getByText("Retrying (1/3)")).not.toBeNull()
    })

    connectionHealthQueryMock.dataUpdatedAt = 2

    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    await waitFor(() => {
      expect(screen.getByText("Connected")).not.toBeNull()
    })
  })

  it("clears delayed mobile nav extras immediately when the drawer closes", async () => {
    vi.useFakeTimers()
    renderRootLayout(["/overview"])

    expect(screen.getAllByLabelText("Language")).toHaveLength(1)

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }))

    expect(screen.getAllByLabelText("Language")).toHaveLength(1)

    act(() => {
      vi.advanceTimersByTime(120)
    })

    expect(screen.getAllByLabelText("Language")).toHaveLength(2)

    fireEvent.click(screen.getAllByRole("button", { name: "Close" })[0])

    expect(screen.getAllByLabelText("Language")).toHaveLength(1)
  })

  it("shows the stats spinner immediately and keeps it visible through the hold window", () => {
    vi.useFakeTimers()
    const view = renderRootLayout(["/overview"])

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).toBeNull()

    activeStatsFetchesMock.value = 1
    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).not.toBeNull()

    activeStatsFetchesMock.value = 0
    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(650)
    })

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).toBeNull()
  })

  it("keeps the media preview mounted while switching routes", async () => {
    seedMediaPreview()

    renderRootLayout(["/overview"])

    expect(screen.getByRole("button", { name: "clip.mp4" })).not.toBeNull()
    expect(document.querySelector("video")?.getAttribute("src")).toBe(
      "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    )

    fireEvent.click(screen.getByRole("link", { name: "Connect RC link" }))

    await waitFor(() => {
      expect(screen.getByText("Connect Screen")).not.toBeNull()
    })

    expect(screen.getByRole("button", { name: "clip.mp4" })).not.toBeNull()
    expect(document.querySelector("video")?.getAttribute("src")).toBe(
      "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    )
  })

  it("clears the media preview when connection scope changes outside explorer", async () => {
    seedMediaPreview()

    renderRootLayout(["/overview"])

    expect(screen.getByRole("button", { name: "clip.mp4" })).not.toBeNull()

    act(() => {
      useConnectionStore.getState().setAuthMode("none")
    })

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "clip.mp4" })).toBeNull()
    })
    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreview).toBeNull()
  })

  it("clears the media preview when validation is lost without a scope change", async () => {
    seedMediaPreview()

    renderRootLayout(["/overview"])

    expect(screen.getByRole("button", { name: "clip.mp4" })).not.toBeNull()

    act(() => {
      useConnectionStore.getState().clearValidation()
    })

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "clip.mp4" })).toBeNull()
    })
    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreview).toBeNull()
  })

  it("keeps the stats spinner visible for the hold window when fetching is already active on mount", () => {
    vi.useFakeTimers()
    activeStatsFetchesMock.value = 1
    const view = renderRootLayout(["/overview"])

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).not.toBeNull()

    activeStatsFetchesMock.value = 0
    view.rerender(
      <AppProviders>
        <MemoryRouter initialEntries={["/overview"]}>
          <Routes>
            <Route path="/" element={<RootLayout />}>
              <Route index element={<div>Connect Screen</div>} />
              <Route path="overview" element={<div>Overview Screen</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AppProviders>,
    )

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(649)
    })

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).not.toBeNull()

    act(() => {
      vi.advanceTimersByTime(1)
    })

    expect(view.container.querySelector(".app-stats-refresh-icon--spin-fast")).toBeNull()
  })
})
