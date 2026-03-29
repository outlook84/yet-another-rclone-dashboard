import { describe, expect, it } from "vitest"
import { buildRcServeProbeUrl, buildRcServeUrl } from "@/features/explorer/lib/rc-serve-url"

describe("buildRcServeUrl", () => {
  it("encodes rc-serve remote and path segments for bracketed file paths", () => {
    expect(buildRcServeUrl("http://localhost:5572", "pikpak-native", "Collection/[OF] Ellie [demo]/2019-08-22.mp4")).toBe(
      "http://localhost:5572/%5Bpikpak-native%3A%5D/Collection/%5BOF%5D%20Ellie%20%5Bdemo%5D/2019-08-22.mp4",
    )
  })

  it("encodes rc-serve URLs for remotes with spaces", () => {
    expect(buildRcServeUrl("http://localhost:5572/", "my remote", "folder/clip.mp4")).toBe(
      "http://localhost:5572/%5Bmy%20remote%3A%5D/folder/clip.mp4",
    )
  })

  it("encodes rc-serve URLs for remotes with plus signs", () => {
    expect(buildRcServeUrl("http://localhost:5572", "team+share", "folder/clip.mp4")).toBe(
      "http://localhost:5572/%5Bteam%2Bshare%3A%5D/folder/clip.mp4",
    )
  })

  it("encodes rc-serve URLs for remotes with unicode characters", () => {
    expect(buildRcServeUrl("http://localhost:5572", "中文Remote", "folder/clip.mp4")).toBe(
      "http://localhost:5572/%5B%E4%B8%AD%E6%96%87Remote%3A%5D/folder/clip.mp4",
    )
  })

  it("returns the remote root URL when the path is empty", () => {
    expect(buildRcServeUrl("http://localhost:5572/", "demo", "")).toBe("http://localhost:5572/%5Bdemo%3A%5D/")
  })

  it("builds the rc-serve probe URL without depending on a remote name", () => {
    expect(buildRcServeProbeUrl("http://localhost:5572/")).toBe("http://localhost:5572/*")
  })
})
