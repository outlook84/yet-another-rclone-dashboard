import { describe, expect, it } from "vitest"
import { getExplorerMediaKind } from "@/features/explorer/lib/media-kind"

describe("getExplorerMediaKind", () => {
  it("detects media kinds from mime type", () => {
    expect(getExplorerMediaKind({ name: "poster.bin", mimeType: "image/webp" })).toBe("image")
    expect(getExplorerMediaKind({ name: "track.bin", mimeType: "audio/flac" })).toBe("audio")
    expect(getExplorerMediaKind({ name: "clip.bin", mimeType: "video/mp4" })).toBe("video")
  })

  it("falls back to file extension when mime type is missing", () => {
    expect(getExplorerMediaKind({ name: "cover.PNG" })).toBe("image")
    expect(getExplorerMediaKind({ name: "mix.MP3" })).toBe("audio")
    expect(getExplorerMediaKind({ name: "movie.WebM" })).toBe("video")
  })

  it("returns null for non-media files", () => {
    expect(getExplorerMediaKind({ name: "archive.zip" })).toBeNull()
  })
})
