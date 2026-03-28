import { describe, expect, it } from "vitest"
import {
  buildGroupDisplayModel,
  buildTransferDisplayModel,
  compareTransferDatesDesc,
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
})
