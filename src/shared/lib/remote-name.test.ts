import { describe, expect, it } from "vitest"
import { isValidRemoteName } from "@/shared/lib/remote-name"

describe("isValidRemoteName", () => {
  it("matches rclone's accepted config-name examples", () => {
    expect(isValidRemoteName("remote")).toBe(true)
    expect(isValidRemoteName("r-emote-")).toBe(true)
    expect(isValidRemoteName("rem ote")).toBe(true)
    expect(isValidRemoteName("user+junkmail@example.com")).toBe(true)
    expect(isValidRemoteName("chữ Quốc ngữ")).toBe(true)
  })

  it("matches rclone's rejected config-name examples", () => {
    expect(isValidRemoteName("")).toBe(false)
    expect(isValidRemoteName("-remote")).toBe(false)
    expect(isValidRemoteName("name-")).toBe(false)
    expect(isValidRemoteName("remote ")).toBe(false)
    expect(isValidRemoteName(" remote")).toBe(false)
    expect(isValidRemoteName("rem:ote")).toBe(false)
  })
})
