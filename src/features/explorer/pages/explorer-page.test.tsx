// @vitest-environment jsdom

import { act, cleanup, fireEvent, screen, waitFor, within, type RenderResult } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ExplorerPage } from "@/features/explorer/pages/explorer-page"
import { useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
import type { ExplorerItem } from "@/shared/api/contracts/explorer"
import { useExplorerStore } from "@/features/explorer/store/explorer-store"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"
import { formatLocalizedCompactDateTime } from "@/shared/i18n/formatters"
import { useConnectionStore } from "@/shared/store/connection-store"
import { renderWithProviders } from "@/test/render-with-providers"

const remotesQueryMock = vi.fn()
const explorerListQueryMock = vi.fn()
const fsInfoQueryMock = vi.fn()
const usageQueryMock = vi.fn()
const mkdirMutationMock = vi.fn()
const batchMutationMock = vi.fn()
const deleteFileMutationMock = vi.fn()
const deleteDirMutationMock = vi.fn()
const copyDirMutationMock = vi.fn()
const copyFileMutationMock = vi.fn()
const moveDirMutationMock = vi.fn()
const moveFileMutationMock = vi.fn()
const publicLinkMutationMock = vi.fn()
const rcServeAvailabilityQueryMock = vi.fn()
const startManagedUploadMock = vi.fn()

vi.mock("@/features/remotes/api/use-remotes-query", () => ({
  useRemotesQuery: () => remotesQueryMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-list-query", () => ({
  useExplorerListQuery: () => explorerListQueryMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-fs-info-query", () => ({
  useExplorerFsInfoQuery: () => fsInfoQueryMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-usage-query", () => ({
  useExplorerUsageQuery: () => usageQueryMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-mkdir-mutation", () => ({
  useExplorerMkdirMutation: () => mkdirMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-batch-mutation", () => ({
  useExplorerBatchMutation: () => batchMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-delete-file-mutation", () => ({
  useExplorerDeleteFileMutation: () => deleteFileMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-delete-dir-mutation", () => ({
  useExplorerDeleteDirMutation: () => deleteDirMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-copy-dir-mutation", () => ({
  useExplorerCopyDirMutation: () => copyDirMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-copy-file-mutation", () => ({
  useExplorerCopyFileMutation: () => copyFileMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-move-dir-mutation", () => ({
  useExplorerMoveDirMutation: () => moveDirMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-move-file-mutation", () => ({
  useExplorerMoveFileMutation: () => moveFileMutationMock(),
}))

vi.mock("@/features/explorer/api/use-explorer-public-link-mutation", () => ({
  useExplorerPublicLinkMutation: () => publicLinkMutationMock(),
}))

vi.mock("@/features/explorer/api/use-rc-serve-availability-query", () => ({
  useRcServeAvailabilityQuery: () => rcServeAvailabilityQueryMock(),
}))

vi.mock("@/features/uploads/lib/upload-manager", () => ({
  startManagedUpload: (...args: unknown[]) => startManagedUploadMock(...args),
}))

// In jsdom there are no real scroll container dimensions, so useVirtualizer
// would produce an empty virtual items list. Mock it to render every item.
vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count, estimateSize }: { count: number; estimateSize: () => number }) => ({
    getTotalSize: () => count * estimateSize(),
    scrollToIndex: vi.fn(),
    getVirtualItems: () =>
      Array.from({ length: count }, (_, i) => ({
        index: i,
        start: i * estimateSize(),
        size: estimateSize(),
        key: i,
        lane: 0,
      })),
    measureElement: () => undefined,
  }),
}))

describe("ExplorerPage", () => {
  const defaultExplorerItems: ExplorerItem[] = [
    {
      name: "alpha",
      path: "folder/alpha",
      type: "dir",
      size: undefined,
      modTime: "2026-03-21T00:00:00Z",
    },
    {
      name: "file.txt",
      path: "folder/file.txt",
      type: "file",
      size: 123,
      modTime: "2026-03-22T00:00:00Z",
    },
    {
      name: "zeta.log",
      path: "folder/zeta.log",
      type: "file",
      size: 99,
      modTime: "2026-03-20T00:00:00Z",
    },
  ]
  let explorerItems: ExplorerItem[] = defaultExplorerItems

  function setMatchMedia(matchesByQuery: Record<string, boolean>) {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: matchesByQuery[query] ?? false,
        media: query,
        onchange: null,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  }

  function getScrollContainer(view: RenderResult) {
    const scrollContainer = view.getByTestId("explorer-scroll-container") as HTMLDivElement | null
    if (!scrollContainer) {
      throw new Error("scroll container not found")
    }

    return scrollContainer
  }

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    explorerItems = defaultExplorerItems
    startManagedUploadMock.mockReset()
    setMatchMedia({})
    useExplorerUIStore.setState({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
    })

    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "secret",
      },
      lastServerInfo: null,
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: { username: "gui", password: "secret" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::basic::gui")
    useExplorerUIStore.getState().setScope("http://localhost:5572::basic::gui")
    useExplorerStore.getState().setLocation("demo", "folder")

    remotesQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [{ name: "demo" }, { name: "other" }],
    })

    explorerListQueryMock.mockImplementation(() => ({
      isLoading: false,
      error: null,
      data: {
        items: explorerItems,
      },
      refetch: vi.fn(),
    }))

    fsInfoQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        hashes: ["MD5"],
        features: {},
      },
      refetch: vi.fn(),
    })

    usageQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        used: 1024,
        free: 2048,
        total: 3072,
      },
      refetch: vi.fn(),
    })

    mkdirMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    batchMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    deleteFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    deleteDirMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    copyDirMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    copyFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    moveDirMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    moveFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })

    publicLinkMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync: vi.fn(),
    })
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: false,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {})
  })

  function expectRcServeDownloadHref({
    remote,
    currentPath,
    fileName,
    filePath,
    expectedHref,
  }: {
    remote: string
    currentPath: string
    fileName: string
    filePath: string
    expectedHref: string
  }) {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: true,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })
    remotesQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: [{ name: remote }, { name: "demo" }, { name: "other" }],
    })
    explorerListQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            name: fileName,
            path: filePath,
            type: "file",
            size: 1024,
            modTime: "2026-03-22T00:00:00Z",
            mimeType: "video/mp4",
          },
        ],
      },
      refetch: vi.fn(),
    })
    useExplorerStore.getState().setLocation(remote, currentPath)

    let appendedAnchorHref: string | null = null
    const originalAppendChild = document.body.appendChild.bind(document.body)
    vi.spyOn(document.body, "appendChild").mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        appendedAnchorHref = node.href
      }
      return originalAppendChild(node)
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText(fileName).closest('[role="row"]')
    if (!fileRow) {
      throw new Error("video row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    fireEvent.click(screen.getByText("Download"))

    const clickedAnchor = HTMLAnchorElement.prototype.click as unknown as ReturnType<typeof vi.fn>
    expect(clickedAnchor).toHaveBeenCalled()
    expect(appendedAnchorHref).toBe(expectedHref)
  }

  it("shows share link action only when backend reports native support", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }
    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    expect(screen.queryByRole("button", { name: "Share Link" })).toBeNull()

    cleanup()
    useExplorerUIStore.setState({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
    })

    fsInfoQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        hashes: ["MD5"],
        features: {
          PublicLink: true,
        },
      },
    })

    renderWithProviders(<ExplorerPage />)

    const supportedFileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!supportedFileRow) {
      throw new Error("file row not found")
    }
    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(within(supportedFileRow as HTMLElement).getByRole("checkbox"))
    expect(screen.getByRole("button", { name: "Share Link" })).not.toBeNull()
  })

  it("does not delete a file when confirmation is rejected", async () => {
    const mutateAsync = vi.fn()
    deleteFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<ExplorerPage />)
    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))
    const dialog = await screen.findByRole("dialog")

    expect(within(dialog).getByText('Delete "folder/file.txt"? This cannot be undone.')).not
      .toBeNull()

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }))

    expect(mutateAsync).not.toHaveBeenCalled()
  })

  it("applies the current explorer location to copy destination", () => {
    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))

    expect(screen.getByText("Copy pending - navigate to the target directory, then apply")).not.toBeNull()
    expect(screen.getByText("Source: demo:folder/file.txt")).not.toBeNull()
    expect(screen.getByText("Destination: demo:folder/file.txt")).not.toBeNull()
  })

  it("keeps pending file actions in sync when the current path is changed manually", () => {
    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Copy" }))
    expect(screen.getByRole("button", { name: "Apply" })).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Edit path" }))
    const pathInput = screen.getByDisplayValue("demo:folder")
    fireEvent.change(pathInput, {
      target: { value: "demo:other-folder" },
    })
    fireEvent.blur(pathInput)

    expect(screen.getByRole("button", { name: "Apply" })).not.toBeNull()
    expect(screen.getByText("Destination: demo:other-folder/file.txt")).not.toBeNull()
  })

  it("filters explorer items by name", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Filter" }))
    fireEvent.change(screen.getByPlaceholderText("Filter by name"), {
      target: { value: "zeta" },
    })

    expect(screen.getByText("zeta.log")).not.toBeNull()
    expect(screen.queryByText("file.txt")).toBeNull()
    expect(screen.queryByText("alpha")).toBeNull()
  })

  it("keeps directories ahead of files while sorting", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Name ↑" }))

    const rows = screen.getAllByRole("row")
    const rowTexts = rows.map((row) => row.textContent ?? "")

    expect(rowTexts[1]).toContain("alpha")
    expect(rowTexts[2]).toContain("zeta.log")
    expect(rowTexts[3]).toContain("file.txt")
  })

  it("opens a directory when its icon is clicked", () => {
    renderWithProviders(<ExplorerPage />)

    const directoryButton = screen.getByRole("button", { name: "alpha" })
    const directoryIcon = directoryButton.querySelector("svg")
    if (!directoryIcon) {
      throw new Error("directory icon not found")
    }

    fireEvent.click(directoryIcon)

    expect(useExplorerStore.getState().currentPath).toBe("folder/alpha")
  })

  it("formats file size for display", () => {
    renderWithProviders(<ExplorerPage />)

    expect(screen.getByText("123 B")).not.toBeNull()
    expect(screen.getByText("99 B")).not.toBeNull()
  })

  it("renders file-type icons for directories and media files", () => {
    explorerItems = [
      {
        name: "photos",
        path: "folder/photos",
        type: "dir",
        size: undefined,
        modTime: "2026-03-21T00:00:00Z",
      },
      {
        name: "cover.png",
        path: "folder/cover.png",
        type: "file",
        size: 120,
        modTime: "2026-03-22T00:00:00Z",
      },
      {
        name: "mix.mp3",
        path: "folder/mix.mp3",
        type: "file",
        size: 240,
        modTime: "2026-03-23T00:00:00Z",
      },
      {
        name: "clip.bin",
        path: "folder/clip.bin",
        type: "file",
        size: 360,
        modTime: "2026-03-24T00:00:00Z",
        mimeType: "video/mp4",
      },
      {
        name: "notes.txt",
        path: "folder/notes.txt",
        type: "file",
        size: 42,
        modTime: "2026-03-25T00:00:00Z",
      },
    ]

    renderWithProviders(<ExplorerPage />)

    const directoryRow = screen.getByText("photos").closest('[role="row"]')
    const imageRow = screen.getByText("cover.png").closest('[role="row"]')
    const audioRow = screen.getByText("mix.mp3").closest('[role="row"]')
    const videoRow = screen.getByText("clip.bin").closest('[role="row"]')
    const genericFileRow = screen.getByText("notes.txt").closest('[role="row"]')

    expect(directoryRow?.querySelector(".tabler-icon-folder-filled")).not.toBeNull()
    expect(imageRow?.querySelector(".tabler-icon-photo")).not.toBeNull()
    expect(audioRow?.querySelector(".tabler-icon-music")).not.toBeNull()
    expect(videoRow?.querySelector(".tabler-icon-video")).not.toBeNull()
    expect(genericFileRow?.querySelector(".tabler-icon-file")).not.toBeNull()
  })

  it("formats modified time for display", () => {
    renderWithProviders(<ExplorerPage />)

    expect(screen.getByText(formatLocalizedCompactDateTime("2026-03-22T00:00:00Z", "en"))).not.toBeNull()
    expect(screen.getByText(formatLocalizedCompactDateTime("2026-03-21T00:00:00Z", "en"))).not.toBeNull()
  })

  it("does not show direct preview or download actions for basic-auth files", () => {
    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    expect(screen.queryByText("Preview")).toBeNull()
    expect(screen.queryByText("Download")).toBeNull()
  })

  it("shows browser preview only for no-auth media files", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerStore.getState().setLocation("demo", "folder")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: true,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })
    explorerListQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            name: "clip.mp4",
            path: "folder/clip.mp4",
            type: "file",
            size: 1024,
            modTime: "2026-03-22T00:00:00Z",
            mimeType: "video/mp4",
          },
        ],
      },
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("clip.mp4").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("video row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    expect(screen.getByText("Preview")).not.toBeNull()
    fireEvent.click(screen.getByText("Preview"))

    const previewScopeKey = useExplorerUIStore.getState().scopeKey!
    expect(useExplorerUIStore.getState().actionsByScope[previewScopeKey]?.mediaPreview).toMatchObject({
      fileName: "clip.mp4",
      kind: "video",
      url: "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    })
  })

  it("keeps media preview open when switching tabs", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: true,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })
    explorerListQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: [
          {
            name: "clip.mp4",
            path: "folder/clip.mp4",
            type: "file",
            size: 1024,
            modTime: "2026-03-22T00:00:00Z",
            mimeType: "video/mp4",
          },
        ],
      },
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("clip.mp4").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("video row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    fireEvent.click(screen.getByText("Preview"))

    const previewScopeKey = useExplorerUIStore.getState().scopeKey!
    expect(useExplorerUIStore.getState().actionsByScope[previewScopeKey]?.mediaPreview).toMatchObject({
      fileName: "clip.mp4",
      path: "folder/clip.mp4",
    })

    act(() => {
      useExplorerStore.getState().addTab({ remote: "demo", path: "other-folder" })
    })

    expect(useExplorerUIStore.getState().actionsByScope[previewScopeKey]?.mediaPreview).toMatchObject({
      fileName: "clip.mp4",
      path: "folder/clip.mp4",
      url: "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    })
  })

  it("shows download for no-auth files and triggers anchor download", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerStore.getState().setLocation("demo", "folder")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: true,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    expect(screen.queryByText("Open")).toBeNull()
    expect(screen.queryByText("Preview")).toBeNull()
    fireEvent.click(screen.getByText("Download"))

    const clickedAnchor = HTMLAnchorElement.prototype.click as unknown as ReturnType<typeof vi.fn>
    expect(clickedAnchor).toHaveBeenCalled()
  })

  it("encodes rc-serve remote and path segments for bracketed file paths", () => {
    expectRcServeDownloadHref({
      remote: "pikpak-native",
      currentPath: "Collection/[OF] Ellie [demo]",
      fileName: "2019-08-22.mp4",
      filePath: "Collection/[OF] Ellie [demo]/2019-08-22.mp4",
      expectedHref:
        "http://localhost:5572/%5Bpikpak-native%3A%5D/Collection/%5BOF%5D%20Ellie%20%5Bdemo%5D/2019-08-22.mp4",
    })
  })

  it("hides direct preview and download actions when rc-serve is unavailable", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerStore.getState().setLocation("demo", "folder")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: false,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    expect(screen.queryByText("Download")).toBeNull()
    expect(screen.queryByText("Preview")).toBeNull()
  })

  it("shows a stable checking state while rc-serve availability is probing", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerStore.getState().setLocation("demo", "folder")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isPending: true,
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.pointerDown(within(fileRow as HTMLElement).getByRole("button", { name: "Item actions" }))
    expect(screen.getByText("Checking")).not.toBeNull()
    expect(screen.queryByText("Download")).toBeNull()
    expect(screen.queryByText("Preview")).toBeNull()
  })

  it("downloads selected files when rc-serve is available", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerStore.getState().setLocation("demo", "folder")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: true,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Select" }))

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    const logRow = screen.getByText("zeta.log").closest('[role="row"]')
    if (!fileRow || !logRow) {
      throw new Error("selection rows not found")
    }

    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(within(logRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Download" }))

    const clickedAnchor = HTMLAnchorElement.prototype.click as unknown as ReturnType<typeof vi.fn>
    expect(clickedAnchor).toHaveBeenCalledTimes(2)
  })

  it("starts a managed upload with the current explorer location after file selection", async () => {
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "basic",
          basicCredentials: { username: "gui", password: "secret" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: true,
        },
      ],
      selectedProfileId: "demo-profile",
    })

    renderWithProviders(<ExplorerPage />)

    const inputClickSpy = vi.spyOn(HTMLInputElement.prototype, "click")

    fireEvent.click(screen.getByRole("button", { name: "Upload" }))

    expect(inputClickSpy).toHaveBeenCalled()

    const uploadInput = document.querySelector('input[type="file"]')
    if (!(uploadInput instanceof HTMLInputElement)) {
      throw new Error("upload input not found")
    }

    const files = [
      new File(["hello"], "first.txt", { type: "text/plain" }),
      new File(["world"], "second.txt", { type: "text/plain" }),
    ]

    fireEvent.change(uploadInput, {
      target: {
        files,
      },
    })

    await waitFor(() => {
      expect(startManagedUploadMock).toHaveBeenCalledWith({
        remote: "demo",
        path: "folder",
        files,
      })
    })

    expect(uploadInput.value).toBe("")
  })

  it("hides the upload action until the profile explicitly enables it", () => {
    renderWithProviders(<ExplorerPage />)

    expect(screen.queryByRole("button", { name: "Upload" })).toBeNull()
  })

  it("hides bulk download actions on compact mobile toolbars", () => {
    setMatchMedia({
      "(max-width: 64em)": true,
    })

    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      lastServerInfo: {
        product: "rclone",
        version: "v1.72.0",
        apiBaseUrl: "http://localhost:5572",
      },
    })
    useSavedConnectionsStore.setState({
      profiles: [
        {
          id: "demo-profile",
          name: "Demo",
          baseUrl: "http://localhost:5572",
          authMode: "none",
          basicCredentials: { username: "", password: "" },
          updatedAt: "2026-03-27T10:00:00.000Z",
          syncEnabled: true,
          uploadEnabled: false,
        },
      ],
      selectedProfileId: "demo-profile",
    })
    useExplorerStore.getState().setScope("http://localhost:5572::none::anonymous")
    useExplorerStore.getState().setLocation("demo", "folder")
    useExplorerUIStore.getState().setScope("http://localhost:5572::none::anonymous")
    rcServeAvailabilityQueryMock.mockReturnValue({
      data: true,
      isLoading: false,
      isPending: false,
      refetch: vi.fn(),
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Select" }))

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    const logRow = screen.getByText("zeta.log").closest('[role="row"]')
    if (!fileRow || !logRow) {
      throw new Error("selection rows not found")
    }

    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(within(logRow as HTMLElement).getByRole("checkbox"))

    expect(screen.queryByRole("button", { name: "Download" })).toBeNull()
  })

  it("encodes rc-serve URLs for remotes with spaces", () => {
    expectRcServeDownloadHref({
      remote: "my remote",
      currentPath: "folder",
      fileName: "clip.mp4",
      filePath: "folder/clip.mp4",
      expectedHref: "http://localhost:5572/%5Bmy%20remote%3A%5D/folder/clip.mp4",
    })
  })

  it("encodes rc-serve URLs for remotes with plus signs", () => {
    expectRcServeDownloadHref({
      remote: "team+share",
      currentPath: "folder",
      fileName: "clip.mp4",
      filePath: "folder/clip.mp4",
      expectedHref: "http://localhost:5572/%5Bteam%2Bshare%3A%5D/folder/clip.mp4",
    })
  })

  it("encodes rc-serve URLs for remotes with unicode characters", () => {
    expectRcServeDownloadHref({
      remote: "中文Remote",
      currentPath: "folder",
      fileName: "clip.mp4",
      filePath: "folder/clip.mp4",
      expectedHref: "http://localhost:5572/%5B%E4%B8%AD%E6%96%87Remote%3A%5D/folder/clip.mp4",
    })
  })

  it("deletes mixed file and directory selections through the batch mutation", async () => {
    const mutateAsync = vi.fn().mockResolvedValue([])
    batchMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Select" }))

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!alphaRow || !fileRow) {
      throw new Error("selection rows not found")
    }

    fireEvent.click(within(alphaRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Delete" }))

    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        remote: "demo",
        currentPath: "folder",
        inputs: [
          { _path: "operations/purge", fs: "demo:", remote: "folder/alpha" },
          { _path: "operations/deletefile", fs: "demo:", remote: "folder/file.txt" },
        ],
      })
    })
  })

  it("keeps the scroll position after deleting and refreshing the current list", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    deleteFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    const view = renderWithProviders(<ExplorerPage />)
    const scrollContainer = getScrollContainer(view)
    scrollContainer.scrollTop = 240

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }
    const fileRowElement = fileRow as HTMLElement

    fireEvent.pointerDown(within(fileRowElement).getByRole("button", { name: "Item actions" }))
    fireEvent.click(await screen.findByRole("menuitem", { name: "Delete" }))

    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        remote: "demo",
        currentPath: "folder",
        targetPaths: ["folder/file.txt"],
      })
    })

    explorerItems = defaultExplorerItems.filter((item) => item.name !== "file.txt")
    act(() => {
      useExplorerStore.getState().setLocation("demo", "folder")
    })

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(240)
    })
  })

  it("refetches list, fs info, and usage when manually refreshing the current location", async () => {
    const listRefetch = vi.fn().mockResolvedValue(undefined)
    const fsInfoRefetch = vi.fn().mockResolvedValue(undefined)
    const usageRefetch = vi.fn().mockResolvedValue(undefined)

    explorerListQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: explorerItems,
      },
      refetch: listRefetch,
    })

    fsInfoQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        hashes: ["MD5"],
        features: { About: true },
      },
      refetch: fsInfoRefetch,
    })

    usageQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        used: 1024,
        free: 2048,
        total: 3072,
      },
      refetch: usageRefetch,
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))

    await waitFor(() => {
      expect(listRefetch).toHaveBeenCalledTimes(1)
      expect(fsInfoRefetch).toHaveBeenCalledTimes(1)
      expect(usageRefetch).toHaveBeenCalledTimes(1)
    })
  })

  it("does not refetch usage when manually refreshing a backend without about support", async () => {
    const listRefetch = vi.fn().mockResolvedValue(undefined)
    const fsInfoRefetch = vi.fn().mockResolvedValue(undefined)
    const usageRefetch = vi.fn().mockResolvedValue(undefined)

    explorerListQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        items: explorerItems,
      },
      refetch: listRefetch,
    })

    fsInfoQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        hashes: ["MD5"],
        features: {},
      },
      refetch: fsInfoRefetch,
    })

    usageQueryMock.mockReturnValue({
      isLoading: false,
      error: null,
      data: {
        used: 1024,
        free: 2048,
        total: 3072,
      },
      refetch: usageRefetch,
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Refresh" }))

    await waitFor(() => {
      expect(listRefetch).toHaveBeenCalledTimes(1)
      expect(fsInfoRefetch).toHaveBeenCalledTimes(1)
    })
    expect(usageRefetch).not.toHaveBeenCalled()
  })

  it("resets the scroll position when the sort mode changes", async () => {
    const view = renderWithProviders(<ExplorerPage />)
    const scrollContainer = getScrollContainer(view)

    scrollContainer.scrollTop = 240
    fireEvent.click(screen.getByRole("button", { name: /^Name / }))

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0)
    })
  })

  it("resets the scroll position when the filter text changes", async () => {
    const view = renderWithProviders(<ExplorerPage />)
    const scrollContainer = getScrollContainer(view)

    scrollContainer.scrollTop = 240
    fireEvent.click(screen.getByRole("button", { name: "Filter" }))
    fireEvent.change(screen.getByPlaceholderText("Filter by name"), {
      target: { value: "file" },
    })

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0)
    })
  })

  it("resets the scroll position when navigating into a different path", async () => {
    const view = renderWithProviders(<ExplorerPage />)
    const scrollContainer = getScrollContainer(view)

    scrollContainer.scrollTop = 240
    fireEvent.click(screen.getByRole("button", { name: "alpha" }))

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0)
    })
  })

  it("resets the scroll position when switching tabs", async () => {
    const view = renderWithProviders(<ExplorerPage />)
    const scrollContainer = getScrollContainer(view)

    act(() => {
      useExplorerStore.getState().addTab({ remote: "demo", path: "other-folder" })
    })

    scrollContainer.scrollTop = 240
    fireEvent.click(screen.getByText("demo:folder"))

    await waitFor(() => {
      expect(scrollContainer.scrollTop).toBe(0)
    })
  })

  it("starts a pending copy from the row action menu", async () => {
    renderWithProviders(<ExplorerPage />)

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    if (!alphaRow) {
      throw new Error("alpha row not found")
    }

    const actionsButton = within(alphaRow as HTMLElement).getByRole("button", { name: "Item actions" })
    fireEvent.pointerDown(actionsButton, { button: 0, ctrlKey: false })
    fireEvent.click(await screen.findByRole("menuitem", { name: "Copy" }))

    expect(screen.getByText("Source: demo:folder/alpha")).not.toBeNull()
    expect(screen.getByText("Destination: demo:folder/alpha")).not.toBeNull()
    expect(screen.getByRole("button", { name: "Apply" })).not.toBeNull()
  })

  it("renames a file through the rename sheet", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    moveFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!fileRow) {
      throw new Error("file row not found")
    }

    fireEvent.click(screen.getByRole("button", { name: "Select" }))
    fireEvent.click(within(fileRow as HTMLElement).getByRole("checkbox"))
    fireEvent.click(screen.getByRole("button", { name: "Rename" }))

    const dialog = await screen.findByRole("dialog")
    const renameInput = within(dialog).getByDisplayValue("file.txt")
    fireEvent.change(renameInput, { target: { value: "renamed.txt" } })
    fireEvent.click(within(dialog).getByRole("button", { name: "Rename" }))

    expect(mutateAsync).toHaveBeenCalledWith({
      srcRemote: "demo",
      currentPath: "folder",
      dstRemote: "demo",
      items: [
        {
          srcPath: "folder/file.txt",
          dstPath: "folder/renamed.txt",
        },
      ],
    })
  })

  it("switches remote and path when a full remote:path draft is applied", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Edit path" }))
    const pathInput = screen.getByDisplayValue("demo:folder")
    fireEvent.change(pathInput, {
      target: { value: "other:archive/2026" },
    })
    fireEvent.blur(pathInput)

    expect(useExplorerStore.getState().currentRemote).toBe("other")
    expect(useExplorerStore.getState().currentPath).toBe("archive/2026")
  })

  it("moves the active explorer row with arrow keys", async () => {
    renderWithProviders(<ExplorerPage />)

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!(alphaRow instanceof HTMLElement) || !(fileRow instanceof HTMLElement)) {
      throw new Error("expected explorer rows")
    }

    alphaRow.focus()
    await waitFor(() => {
      expect(document.activeElement).toBe(alphaRow)
    })

    fireEvent.keyDown(alphaRow, { key: "ArrowDown" })

    await waitFor(() => {
      expect(document.activeElement).toBe(fileRow)
    })
  })

  it("jumps to the first and last explorer rows with Home and End", () => {
    renderWithProviders(<ExplorerPage />)

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    const logRow = screen.getByText("zeta.log").closest('[role="row"]')
    if (!(alphaRow instanceof HTMLElement) || !(logRow instanceof HTMLElement)) {
      throw new Error("expected explorer rows")
    }

    alphaRow.focus()
    fireEvent.keyDown(alphaRow, { key: "End" })
    expect(document.activeElement).toBe(logRow)

    fireEvent.keyDown(logRow, { key: "Home" })
    expect(document.activeElement).toBe(alphaRow)
  })

  it("moves by a page with PageUp and PageDown", () => {
    renderWithProviders(<ExplorerPage />)

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    const logRow = screen.getByText("zeta.log").closest('[role="row"]')
    const scrollContainer = screen.getByTestId("explorer-scroll-container")
    if (!(alphaRow instanceof HTMLElement) || !(logRow instanceof HTMLElement) || !(scrollContainer instanceof HTMLDivElement)) {
      throw new Error("expected explorer rows and scroll container")
    }

    Object.defineProperty(scrollContainer, "clientHeight", {
      configurable: true,
      value: 80,
    })

    alphaRow.focus()
    fireEvent.keyDown(alphaRow, { key: "PageDown" })
    expect(document.activeElement).toBe(logRow)

    fireEvent.keyDown(logRow, { key: "PageUp" })
    expect(document.activeElement).toBe(alphaRow)
  })

  it("opens the active directory row with Enter", () => {
    renderWithProviders(<ExplorerPage />)

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    if (!(alphaRow instanceof HTMLElement)) {
      throw new Error("expected alpha row")
    }

    alphaRow.focus()
    fireEvent.keyDown(alphaRow, { key: "Enter" })

    expect(useExplorerStore.getState().currentPath).toBe("folder/alpha")
  })

  it("does not trigger explorer row shortcuts before the list receives focus", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    deleteFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.keyDown(window, { key: "Backspace" })
    fireEvent.keyDown(window, { key: "Delete" })
    fireEvent.keyDown(window, { key: "Enter" })

    expect(useExplorerStore.getState().currentPath).toBe("folder")
    expect(screen.queryByRole("dialog")).toBeNull()
    await waitFor(() => {
      expect(mutateAsync).not.toHaveBeenCalled()
    })
  })

  it("lets arrow keys enter explorer row navigation before a row is focused", async () => {
    renderWithProviders(<ExplorerPage />)

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    if (!(alphaRow instanceof HTMLElement)) {
      throw new Error("expected alpha row")
    }

    fireEvent.keyDown(window, { key: "ArrowDown" })

    await waitFor(() => {
      expect(document.activeElement).toBe(alphaRow)
    })
  })

  it("navigates to the parent directory with Backspace from a focused row", () => {
    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!(fileRow instanceof HTMLElement)) {
      throw new Error("expected file row")
    }

    fileRow.focus()
    fireEvent.keyDown(fileRow, { key: "Backspace" })

    expect(useExplorerStore.getState().currentPath).toBe("")
  })

  it("opens row actions with Ctrl+Enter from the active row", async () => {
    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!(fileRow instanceof HTMLElement)) {
      throw new Error("expected file row")
    }

    fileRow.focus()
    fireEvent.keyDown(fileRow, { key: "Enter", ctrlKey: true })

    expect(await screen.findByRole("menuitem", { name: "Copy" })).not.toBeNull()
  })

  it("deletes the active row with Delete after confirmation", async () => {
    const mutateAsync = vi.fn().mockResolvedValue(undefined)
    deleteFileMutationMock.mockReturnValue({
      isPending: false,
      isSuccess: false,
      error: null,
      variables: undefined,
      mutateAsync,
    })

    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!(fileRow instanceof HTMLElement)) {
      throw new Error("expected file row")
    }

    fileRow.focus()
    fireEvent.keyDown(fileRow, { key: "Delete" })

    const dialog = await screen.findByRole("dialog")
    fireEvent.click(within(dialog).getByRole("button", { name: "Delete" }))

    await waitFor(() => {
      expect(mutateAsync).toHaveBeenCalledWith({
        remote: "demo",
        currentPath: "folder",
        targetPaths: ["folder/file.txt"],
      })
    })
  })

  it("closes explorer transient UI with Escape", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Filter" }))
    expect(screen.getByPlaceholderText("Filter by name")).not.toBeNull()

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    if (!(alphaRow instanceof HTMLElement)) {
      throw new Error("expected alpha row")
    }

    alphaRow.focus()
    fireEvent.keyDown(alphaRow, { key: "Escape" })

    expect(screen.queryByPlaceholderText("Filter by name")).toBeNull()
  })

  it("returns focus to the row after closing the row action menu with Escape", async () => {
    renderWithProviders(<ExplorerPage />)

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!(fileRow instanceof HTMLElement)) {
      throw new Error("expected file row")
    }

    fileRow.focus()
    fireEvent.keyDown(fileRow, { key: "Enter", ctrlKey: true })
    expect(await screen.findByRole("menuitem", { name: "Copy" })).not.toBeNull()

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Copy" })).toBeNull()
      expect(document.activeElement).toBe(fileRow)
    })
  })

  it("uses Escape for explorer UI before minimizing an open media preview", () => {
    useExplorerUIStore.getState().setMediaPreview({
      fileName: "clip.mp4",
      kind: "video",
      layout: "video-landscape",
      path: "folder/clip.mp4",
      url: "http://localhost:5572/%5Bdemo%3A%5D/folder/clip.mp4",
    })

    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Filter" }))
    expect(screen.getByPlaceholderText("Filter by name")).not.toBeNull()

    const alphaRow = screen.getByText("alpha").closest('[role="row"]')
    if (!(alphaRow instanceof HTMLElement)) {
      throw new Error("expected alpha row")
    }

    alphaRow.focus()
    fireEvent.keyDown(alphaRow, { key: "Escape" })

    expect(screen.queryByPlaceholderText("Filter by name")).toBeNull()
    const scopeState = useExplorerUIStore.getState().actionsByScope["http://localhost:5572::basic::gui"]
    expect(scopeState?.mediaPreview).not.toBeNull()
    expect(scopeState?.mediaPreviewMinimized).not.toBe(true)
  })

  it("closes the row menu when switching tabs", async () => {
    renderWithProviders(<ExplorerPage />)

    act(() => {
      useExplorerStore.getState().addTab({ remote: "demo", path: "folder" })
    })

    const fileRow = screen.getByText("file.txt").closest('[role="row"]')
    if (!(fileRow instanceof HTMLElement)) {
      throw new Error("expected file row")
    }

    fileRow.focus()
    fireEvent.keyDown(fileRow, { key: "Enter", ctrlKey: true })
    expect(await screen.findByRole("menuitem", { name: "Copy" })).not.toBeNull()
    expect(fileRow.className).toContain("ring-1")

    const duplicateTab = screen.getAllByText("demo:folder")[1]
    if (!(duplicateTab instanceof HTMLElement)) {
      throw new Error("expected duplicate tab")
    }
    fireEvent.click(duplicateTab)

    await waitFor(() => {
      expect(screen.queryByRole("menuitem", { name: "Copy" })).toBeNull()
    })
  })

  it("closes the new folder input with Escape while typing", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "New Folder" }))
    const input = screen.getByRole("textbox")
    fireEvent.change(input, { target: { value: "draft" } })
    fireEvent.keyDown(input, { key: "Escape" })

    expect(screen.queryByDisplayValue("draft")).toBeNull()
  })

  it("closes the filter input with Escape while typing", () => {
    renderWithProviders(<ExplorerPage />)

    fireEvent.click(screen.getByRole("button", { name: "Filter" }))
    const input = screen.getByPlaceholderText("Filter by name")
    fireEvent.change(input, { target: { value: "alp" } })
    fireEvent.keyDown(input, { key: "Escape" })

    expect(screen.queryByPlaceholderText("Filter by name")).toBeNull()
  })
})
