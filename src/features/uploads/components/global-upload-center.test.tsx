// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { useState } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppProviders } from "@/app/providers/app-providers"
import { GlobalUploadCenter } from "@/features/uploads/components/global-upload-center"
import { useUploadCenterStore, type UploadTask } from "@/features/uploads/store/upload-center-store"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { renderWithProviders } from "@/test/render-with-providers"

type MatchMediaController = {
  setMatches: (value: boolean) => void
}

function mockMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<() => void>()

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") {
        listeners.add(listener)
      }
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") {
        listeners.delete(listener)
      }
    }),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia

  return {
    setMatches(value) {
      matches = value
      listeners.forEach((listener) => listener())
    },
  }
}

function buildUploadTask(overrides: Partial<UploadTask> = {}): UploadTask {
  return {
    id: "upload-1",
    remote: "demo",
    path: "/folder",
    fileCount: 1,
    totalBytes: 1024,
    uploadedBytes: 256,
    completedFiles: 0,
    currentFileName: "clip.mp4",
    currentFileSize: 1024,
    currentFileUploadedBytes: 256,
    fileNames: ["clip.mp4"],
    status: "uploading",
    errorMessage: null,
    startedAt: "2026-03-29T10:00:00.000Z",
    lastProgressAt: "2026-03-29T10:00:02.000Z",
    progressEventCount: 3,
    ...overrides,
  }
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

function UploadCenterHarness() {
  const [, setTick] = useState(0)

  return (
    <>
      <button type="button" onClick={() => setTick((value) => value + 1)}>
        rerender
      </button>
      <GlobalUploadCenter />
    </>
  )
}

describe("GlobalUploadCenter", () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    mockMatchMedia(false)
    useUploadCenterStore.setState({
      tasks: [buildUploadTask()],
      collapsed: false,
    })
    useExplorerUIStore.setState({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
      mediaPreviewSizes: {
        audio: { width: 520, height: 240 },
        "video-landscape": { width: 720, height: 520 },
        "video-portrait": { width: 396, height: 620 },
        "image-landscape": { width: 720, height: 560 },
        "image-portrait": { width: 460, height: 720 },
      },
    })
  })

  it("stays at the default bottom offset when no media preview is open", () => {
    renderWithProviders(<GlobalUploadCenter />)

    const floatingContainer = screen.getByText("Upload Tasks").closest("div.fixed") as HTMLDivElement | null

    expect(floatingContainer).not.toBeNull()
    expect(floatingContainer?.style.bottom).toBe("16px")
    expect(floatingContainer?.style.right).toBe("16px")
  })

  it("moves above the desktop media preview footprint", () => {
    seedMediaPreview()
    useUploadCenterStore.setState({ collapsed: true })

    renderWithProviders(<GlobalUploadCenter />)

    const floatingContainer = screen.getByRole("button", { name: "Upload Tasks 1" }).closest("div.fixed") as HTMLDivElement | null

    expect(floatingContainer).not.toBeNull()
    expect(floatingContainer?.style.bottom).toBe("548px")
  })

  it("moves above the minimized media preview pill", () => {
    seedMediaPreview()
    useExplorerUIStore.getState().setMediaPreviewMinimized(true)
    useUploadCenterStore.setState({ collapsed: true })

    renderWithProviders(<GlobalUploadCenter />)

    const floatingContainer = screen.getByRole("button", { name: "Upload Tasks 1" }).closest("div.fixed") as HTMLDivElement | null

    expect(floatingContainer).not.toBeNull()
    expect(floatingContainer?.style.bottom).toBe("68px")
  })

  it("moves above the minimized media preview pill on compact screens", () => {
    mockMatchMedia(true)
    seedMediaPreview()
    useExplorerUIStore.getState().setMediaPreviewMinimized(true)
    useUploadCenterStore.setState({ collapsed: true })

    renderWithProviders(<GlobalUploadCenter />)

    const floatingContainer = screen.getByRole("button", { name: "Upload Tasks 1" }).closest("div.fixed") as HTMLDivElement | null

    expect(floatingContainer).not.toBeNull()
    expect(floatingContainer?.style.bottom).toBe("68px")
  })

  it("minimizes the media preview when the upload center is expanded", async () => {
    seedMediaPreview()

    renderWithProviders(<GlobalUploadCenter />)

    await waitFor(() => {
      expect(
        useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreviewMinimized,
      ).toBe(true)
    })
  })

  it("hides while the compact full-screen media preview is open", () => {
    mockMatchMedia(true)
    seedMediaPreview()

    renderWithProviders(<GlobalUploadCenter />)

    expect(screen.queryByText("Upload Tasks")).toBeNull()
  })

  it("does not break hook ordering when tasks appear after an empty render", () => {
    useUploadCenterStore.setState({
      tasks: [],
      collapsed: false,
    })

    render(
      <AppProviders>
        <UploadCenterHarness />
      </AppProviders>,
    )

    expect(screen.queryByText("Upload Tasks")).toBeNull()

    useUploadCenterStore.setState({
      tasks: [buildUploadTask()],
      collapsed: false,
    })

    fireEvent.click(screen.getByRole("button", { name: "rerender" }))

    expect(screen.getByText("Upload Tasks")).not.toBeNull()
  })

  it("collapses on Escape even when focus is inside upload panel actions", () => {
    renderWithProviders(<GlobalUploadCenter />)

    const collapseButton = screen.getByRole("button", { name: "Collapse upload tasks" })
    collapseButton.focus()
    fireEvent.keyDown(collapseButton, { key: "Escape" })

    expect(useUploadCenterStore.getState().collapsed).toBe(true)
  })

  it("collapses on Escape even when focus is outside the upload panel", () => {
    renderWithProviders(
      <>
        <button type="button">outside</button>
        <GlobalUploadCenter />
      </>,
    )

    const outsideButton = screen.getByRole("button", { name: "outside" })
    outsideButton.focus()
    fireEvent.keyDown(outsideButton, { key: "Escape" })

    expect(useUploadCenterStore.getState().collapsed).toBe(true)
  })

  it("does not collapse when Escape was already consumed by higher-priority UI", () => {
    renderWithProviders(<GlobalUploadCenter />)

    const event = new KeyboardEvent("keydown", {
      key: "Escape",
      bubbles: true,
      cancelable: true,
    })
    event.preventDefault()
    window.dispatchEvent(event)

    expect(useUploadCenterStore.getState().collapsed).toBe(false)
  })
})
