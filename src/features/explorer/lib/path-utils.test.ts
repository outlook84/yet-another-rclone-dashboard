import { describe, expect, it } from "vitest"
import { joinPath, normalizePath, parentPath } from "@/features/explorer/lib/path-utils"

describe("explorer path utils", () => {
  it("normalizes leading and trailing slashes", () => {
    expect(normalizePath("/alpha/beta/")).toBe("alpha/beta")
    expect(normalizePath("///alpha///")).toBe("alpha")
    expect(normalizePath("/")).toBe("")
  })

  it("joins path segments safely", () => {
    expect(joinPath("", "child")).toBe("child")
    expect(joinPath("parent", "child")).toBe("parent/child")
    expect(joinPath("/parent/", "/child/")).toBe("parent/child")
  })

  it("returns the parent path", () => {
    expect(parentPath("alpha/beta/gamma")).toBe("alpha/beta")
    expect(parentPath("/alpha/")).toBe("")
    expect(parentPath("")).toBe("")
  })
})
