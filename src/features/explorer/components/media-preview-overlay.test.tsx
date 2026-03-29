// @vitest-environment jsdom

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { MediaPreviewOverlay } from "@/features/explorer/components/media-preview-overlay"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { useUploadCenterStore, type UploadTask } from "@/features/uploads/store/upload-center-store"
import { renderWithProviders } from "@/test/render-with-providers"

function mockMatchMedia(initialMatches: boolean) {
  let matches = initialMatches

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia

  return {
    setMatches(value: boolean) {
      matches = value
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

function seedImagePreview() {
  useExplorerUIStore.getState().setScope("http://localhost:5572::basic::gui")
  useExplorerUIStore.getState().setMediaPreview({
    fileName: "photo.jpg",
    kind: "image",
    layout: "image-landscape",
    path: "folder/photo.jpg",
    url: "http://localhost:5572/%5Bdemo%3A%5D/folder/photo.jpg",
  })
}

describe("MediaPreviewOverlay", () => {
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
    seedMediaPreview()
  })

  it("can minimize the preview into a compact pill", () => {
    renderWithProviders(<MediaPreviewOverlay />)

    fireEvent.click(screen.getByRole("button", { name: "Minimize preview" }))

    expect(screen.getAllByRole("button", { name: "Restore preview" }).length).toBeGreaterThan(0)
    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreviewMinimized).toBe(true)
  })

  it("restores the preview and collapses uploads when reopening from the minimized pill", () => {
    useExplorerUIStore.getState().setMediaPreviewMinimized(true)
    useUploadCenterStore.setState({ collapsed: false })

    renderWithProviders(<MediaPreviewOverlay />)

    fireEvent.click(screen.getAllByRole("button", { name: "Restore preview" })[0]!)

    expect(useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]?.mediaPreviewMinimized).toBe(false)
    expect(useUploadCenterStore.getState().collapsed).toBe(true)
  })

  it("renders the minimized pill on compact screens too", () => {
    mockMatchMedia(true)

    renderWithProviders(<MediaPreviewOverlay />)

    fireEvent.click(screen.getByRole("button", { name: "Minimize preview" }))

    expect(screen.getAllByRole("button", { name: "Restore preview" }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "Minimize preview" })).toBeNull()
  })

  it("uses an image-style restore icon for minimized image previews", () => {
    useExplorerUIStore.getState().setMediaPreview(null)
    seedImagePreview()

    renderWithProviders(<MediaPreviewOverlay />)

    fireEvent.click(screen.getByRole("button", { name: "Minimize preview" }))

    expect(document.querySelector(".tabler-icon-photo")).not.toBeNull()
    expect(document.querySelector(".tabler-icon-player-play")).toBeNull()
  })
})
