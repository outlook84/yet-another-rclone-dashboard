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
import packageJson from "../../../package.json"

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

function seedMediaPreview(fileName = "clip.mp4") {
  useExplorerUIStore.getState().setScope("http://localhost:5572::basic::gui")
  useExplorerUIStore.getState().setMediaPreview({
    fileName,
    kind: "video",
    layout: "video-landscape",
    path: "folder/clip.mp4",
    url: "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
  })
}

function restoreMediaPreviewIfNeeded() {
  const restoreButtons = screen.queryAllByRole("button", { name: "Restore preview" })
  if (restoreButtons.length > 0) {
    fireEvent.click(restoreButtons[0]!)
  }
}

describe("RootLayout", () => {
  const packageJsonRecord = packageJson as Record<string, unknown>
  const originalRepository = packageJson.repository

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.useRealTimers()
    packageJsonRecord.repository = originalRepository
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

  it("renders the GitHub project link with the localized accessible name and repository href", async () => {
    renderRootLayout(["/overview"])

    const githubLink = await screen.findByRole("link", { name: "Open GitHub project" })

    expect(githubLink.getAttribute("href")).toBe("https://github.com/outlook84/yet-another-rclone-dashboard")
    expect(githubLink.getAttribute("title")).toBe("Open GitHub project")
  })

  it("does not render the GitHub project link when repository metadata is missing", () => {
    delete packageJsonRecord.repository

    renderRootLayout(["/overview"])

    expect(screen.queryByRole("link", { name: "Open GitHub project" })).toBeNull()
  })

  it("keeps the media preview mounted while switching routes", async () => {
    seedMediaPreview()

    renderRootLayout(["/overview"])

    expect(screen.getByText("clip.mp4")).not.toBeNull()
    restoreMediaPreviewIfNeeded()
    expect(document.querySelector("video")?.getAttribute("src")).toBe(
      "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    )

    fireEvent.click(screen.getByRole("link", { name: "Connect RC link" }))

    await waitFor(() => {
      expect(screen.getByText("Connect Screen")).not.toBeNull()
    })

    expect(screen.getByText("clip.mp4")).not.toBeNull()
    restoreMediaPreviewIfNeeded()
    expect(document.querySelector("video")?.getAttribute("src")).toBe(
      "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    )
  })

  it("preserves a literal undefined filename in the media preview title", () => {
    seedMediaPreview("undefined")

    renderRootLayout(["/overview"])

    expect(screen.getByText("undefined")).not.toBeNull()
  })

  it("preserves leading and trailing spaces in media preview download names", () => {
    seedMediaPreview(" report.txt ")
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})

    const originalCreateElement = document.createElement.bind(document)
    let createdAnchor: HTMLAnchorElement | null = null
    vi.spyOn(document, "createElement").mockImplementation(((tagName: string, options?: ElementCreationOptions) => {
      const element = originalCreateElement(tagName, options)
      if (tagName === "a") {
        createdAnchor = element as HTMLAnchorElement
      }
      return element
    }) as typeof document.createElement)

    renderRootLayout(["/overview"])

    expect(
      screen.getByText((content, element) => element?.textContent === " report.txt " && content.includes("report.txt")),
    ).not.toBeNull()

    restoreMediaPreviewIfNeeded()
    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    if (!createdAnchor) {
      throw new Error("download anchor was not created")
    }

    expect(anchorClickSpy).toHaveBeenCalled()
    expect((createdAnchor as HTMLAnchorElement).getAttribute("download")).toBe(" report.txt ")
  })

  it("clears the media preview when connection scope changes outside explorer", async () => {
    seedMediaPreview()

    renderRootLayout(["/overview"])

    expect(screen.getByText("clip.mp4")).not.toBeNull()

    act(() => {
      useConnectionStore.getState().setAuthMode("none")
    })

    await waitFor(() => {
      expect(screen.queryByText("clip.mp4")).toBeNull()
    })
    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreview).toBeNull()
  })

  it("clears the media preview when validation is lost without a scope change", async () => {
    seedMediaPreview()

    renderRootLayout(["/overview"])

    expect(screen.getByText("clip.mp4")).not.toBeNull()

    act(() => {
      useConnectionStore.getState().clearValidation()
    })

    await waitFor(() => {
      expect(screen.queryByText("clip.mp4")).toBeNull()
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
