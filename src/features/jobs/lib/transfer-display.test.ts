import { describe, expect, it } from "vitest"
import {
  buildGroupDisplayModel,
  buildPastGroupModels,
  buildTransferDisplayModel,
  compareTransferDatesDesc,
  isAnonymousGroup,
  parseFsLabel,
  splitTransferName,
} from "@/features/jobs/lib/transfer-display"

describe("transfer-display", () => {
  it("parses backend fs labels with inline options", () => {
    expect(parseFsLabel("remote{token=abc}:/folder/sub")).toEqual({
      remoteLabel: "remote",
      basePath: "/folder/sub",
    })
    expect(parseFsLabel("remote:")).toEqual({
      remoteLabel: "remote",
      basePath: null,
    })
  })

  it("builds file display text from transfer path segments", () => {
    expect(splitTransferName("folder\\nested\\demo.txt")).toEqual({
      leafName: "demo.txt",
      parentPath: "folder/nested",
    })

    expect(
      buildTransferDisplayModel({
        name: "folder/nested/demo.txt",
        srcFs: "source:",
        dstFs: "target:/archive",
      }),
    ).toEqual({
      leafName: "demo.txt",
      sourceText: "source:folder/nested",
      destinationText: "target:/archive",
      destinationUsesStorageLabel: false,
    })
  })

  it("handles grouped transfers and sorts invalid dates last", () => {
    expect(
      buildGroupDisplayModel([
        {
          name: "folder/demo.txt",
          srcFs: "source:",
          dstFs: "target:",
        },
      ]),
    ).toEqual({
      leafName: "demo.txt",
      sourceText: "source:folder",
      destinationText: "target",
      destinationUsesStorageLabel: true,
    })

    expect(
      buildGroupDisplayModel([
        {
          name: "folder/demo.txt",
          srcFs: "source:",
          dstFs: "target:",
        },
        {
          name: "other/keep.txt",
          srcFs: "source:",
          dstFs: "target:",
        },
      ]),
    ).toEqual({
      leafName: "-",
      sourceText: "source",
      destinationText: "target",
      destinationUsesStorageLabel: true,
    })

    expect(compareTransferDatesDesc("2026-03-28T10:00:00.000Z", "invalid")).toBeLessThan(0)
    expect(compareTransferDatesDesc(undefined, undefined)).toBe(0)
  })

  it("classifies anonymous groups (empty or job/N)", () => {
    expect(isAnonymousGroup(undefined)).toBe(true)
    expect(isAnonymousGroup("")).toBe(true)
    expect(isAnonymousGroup("job/42")).toBe(true)
    expect(isAnonymousGroup("job/9999")).toBe(true)
    expect(isAnonymousGroup("my-named-group")).toBe(false)
    expect(isAnonymousGroup("photos-2026-05-13")).toBe(false)
  })

  it("rolls up past transfers by named group, with anonymous items in their own bucket", () => {
    const groups = buildPastGroupModels([
      {
        name: "photos/01.jpg",
        group: "photos-batch",
        bytes: 100,
        size: 100,
        completedAt: "2026-05-13T10:00:00Z",
        startedAt: "2026-05-13T09:59:00Z",
      },
      {
        name: "photos/02.jpg",
        group: "photos-batch",
        bytes: 200,
        size: 200,
        completedAt: "2026-05-13T10:01:00Z",
        startedAt: "2026-05-13T09:59:10Z",
        error: "broken",
      },
      {
        name: "docs/report.pdf",
        group: "documents-batch",
        bytes: 50,
        size: 50,
        completedAt: "2026-05-13T10:05:00Z",
      },
      {
        name: "loose.bin",
        group: "job/42",
        bytes: 10,
        size: 10,
        completedAt: "2026-05-13T10:06:00Z",
      },
    ])

    // named groups sort by latest completedAt desc; anonymous at end
    expect(groups.map((g) => g.key)).toEqual(["documents-batch", "photos-batch", "__ungrouped__"])

    const photos = groups.find((g) => g.key === "photos-batch")!
    expect(photos.label).toBe("photos-batch")
    expect(photos.items).toHaveLength(2)
    expect(photos.totalBytes).toBe(300)
    expect(photos.totalSize).toBe(300)
    expect(photos.successCount).toBe(1)
    expect(photos.failedCount).toBe(1)
    expect(photos.earliestStartedAt).toBe("2026-05-13T09:59:00Z")
    expect(photos.latestCompletedAt).toBe("2026-05-13T10:01:00Z")

    const ungrouped = groups.find((g) => g.key === "__ungrouped__")!
    expect(ungrouped.label).toBeNull()
    expect(ungrouped.items).toHaveLength(1)
    expect(ungrouped.totalBytes).toBe(10)
  })

  it("returns an empty array when there are no past transfers", () => {
    expect(buildPastGroupModels([])).toEqual([])
  })
})
