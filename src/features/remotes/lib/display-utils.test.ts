import { describe, expect, it } from "vitest"
import {
  countConfigKeys,
  countEnabledFeatures,
  formatHashSupport,
  formatPublicLinkSupport,
} from "@/features/remotes/lib/display-utils"

describe("remotes display-utils", () => {
  it("summarizes config and feature metadata", () => {
    expect(
      countConfigKeys({
        name: "demo",
        backend: "s3",
        source: "rclone-rc",
        config: { provider: "MinIO", region: "auto" },
      }),
    ).toBe(2)

    expect(
      countEnabledFeatures({
        hashes: ["MD5"],
        features: {
          PublicLink: true,
          Move: true,
          Copy: false,
        },
      }),
    ).toBe(2)
  })

  it("formats hash support and public link status", () => {
    expect(formatHashSupport({ hashes: ["MD5", "SHA1"] })).toBe("MD5, SHA1")
    expect(formatHashSupport(null)).toBe("Unknown")
    expect(formatPublicLinkSupport({ features: { PublicLink: true } })).toBe("Supported")
    expect(formatPublicLinkSupport({ features: {} })).toBe("Not reported")
  })
})
