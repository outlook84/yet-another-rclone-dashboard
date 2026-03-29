import { beforeEach, describe, expect, it } from "vitest"
import { useExplorerUIStore } from "@/features/explorer/store/explorer-ui-store"

describe("useExplorerUIStore", () => {
  beforeEach(() => {
    useExplorerUIStore.setState({
      scopeKey: null,
      actionsByScope: {},
      inspectDirectoryPaths: {},
      selectionModes: {},
      selectedPathsByTab: {},
    })
  })

  it("keeps pending actions isolated by scope", () => {
    useExplorerUIStore.getState().setScope("scope-a")
    useExplorerUIStore.getState().setPendingTransferAction({
      mode: "copy",
      sourceRemote: "remote-a:",
      sourcePath: "folder-a",
      items: [
        {
          itemType: "file",
          itemName: "demo.txt",
          srcPath: "folder-a/demo.txt",
        },
      ],
    })

    useExplorerUIStore.getState().setScope("scope-b")
    useExplorerUIStore.getState().setPendingRenameAction({
      item: {
        itemType: "dir",
        itemName: "photos",
        srcPath: "photos",
      },
      nextName: "archive",
    })

    expect(useExplorerUIStore.getState().actionsByScope["scope-b"]).toMatchObject({
      pendingTransferAction: null,
      pendingRenameAction: {
        nextName: "archive",
      },
      mediaPreviewMinimized: false,
    })

    useExplorerUIStore.getState().setScope("scope-a")

    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]).toMatchObject({
      pendingTransferAction: {
        mode: "copy",
        sourceRemote: "remote-a:",
      },
      pendingRenameAction: null,
    })
  })

  it("supports updater functions for scoped actions and shared ui maps", () => {
    useExplorerUIStore.getState().setScope("scope-a")
    useExplorerUIStore.getState().setPendingTransferAction({
      mode: "copy",
      sourceRemote: "remote-a:",
      sourcePath: "folder-a",
      items: [],
    })
    useExplorerUIStore.getState().setPendingTransferAction((prev) =>
      prev
        ? {
            ...prev,
            mode: "move",
          }
        : prev,
    )

    useExplorerUIStore.getState().setInspectDirectoryPaths(() => ({ "tab-1": "/tmp" }))
    useExplorerUIStore.getState().setSelectionModes((prev) => ({ ...prev, "tab-1": true }))
    useExplorerUIStore.getState().setSelectedPathsByTab((prev) => ({
      ...prev,
      "tab-1": ["a.txt", "b.txt"],
    }))

    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.pendingTransferAction).toMatchObject({
      mode: "move",
      sourcePath: "folder-a",
    })
    expect(useExplorerUIStore.getState().inspectDirectoryPaths).toEqual({ "tab-1": "/tmp" })
    expect(useExplorerUIStore.getState().selectionModes).toEqual({ "tab-1": true })
    expect(useExplorerUIStore.getState().selectedPathsByTab).toEqual({
      "tab-1": ["a.txt", "b.txt"],
    })
  })

  it("keeps media preview isolated by scope", () => {
    useExplorerUIStore.getState().setScope("scope-a")
    useExplorerUIStore.getState().setMediaPreview({
      fileName: "clip.mp4",
      kind: "video",
      layout: "video-landscape",
      path: "folder/clip.mp4",
      url: "http://localhost/clip.mp4",
    })

    useExplorerUIStore.getState().setScope("scope-b")
    expect(useExplorerUIStore.getState().actionsByScope["scope-b"]?.mediaPreview).toBeNull()
    expect(useExplorerUIStore.getState().actionsByScope["scope-b"]?.mediaPreviewMinimized).toBe(false)

    useExplorerUIStore.getState().setScope("scope-a")
    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.mediaPreview).toMatchObject({
      fileName: "clip.mp4",
      kind: "video",
    })
    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.mediaPreviewMinimized).toBe(false)
  })

  it("resets minimized state when opening a media preview", () => {
    useExplorerUIStore.getState().setScope("scope-a")
    useExplorerUIStore.getState().setMediaPreview({
      fileName: "clip.mp4",
      kind: "video",
      layout: "video-landscape",
      path: "folder/clip.mp4",
      url: "http://localhost/clip.mp4",
    })
    useExplorerUIStore.getState().setMediaPreviewMinimized(true)

    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.mediaPreviewMinimized).toBe(true)

    useExplorerUIStore.getState().setMediaPreview({
      fileName: "photo.jpg",
      kind: "image",
      layout: "image-landscape",
      path: "folder/photo.jpg",
      url: "http://localhost/photo.jpg",
    })

    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.mediaPreviewMinimized).toBe(false)
  })

  it("clears media previews across all scopes", () => {
    useExplorerUIStore.getState().setScope("scope-a")
    useExplorerUIStore.getState().setMediaPreview({
      fileName: "clip-a.mp4",
      kind: "video",
      layout: "video-landscape",
      path: "folder/clip-a.mp4",
      url: "http://localhost/clip-a.mp4",
    })

    useExplorerUIStore.getState().setScope("scope-b")
    useExplorerUIStore.getState().setMediaPreview({
      fileName: "clip-b.mp4",
      kind: "video",
      layout: "video-landscape",
      path: "folder/clip-b.mp4",
      url: "http://localhost/clip-b.mp4",
    })

    useExplorerUIStore.getState().clearAllMediaPreviews()

    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.mediaPreview).toBeNull()
    expect(useExplorerUIStore.getState().actionsByScope["scope-b"]?.mediaPreview).toBeNull()
    expect(useExplorerUIStore.getState().actionsByScope["scope-a"]?.mediaPreviewMinimized).toBe(false)
    expect(useExplorerUIStore.getState().actionsByScope["scope-b"]?.mediaPreviewMinimized).toBe(false)
  })
})
