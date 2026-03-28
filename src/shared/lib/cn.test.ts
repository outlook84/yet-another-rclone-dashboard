import { describe, expect, it } from "vitest"
import { cn } from "@/shared/lib/cn"

describe("cn", () => {
  it("merges conditional and conflicting tailwind classes", () => {
    const isHidden = false
    expect(cn("px-2", isHidden && "hidden", "px-4", "text-sm")).toBe("px-4 text-sm")
  })

  it("keeps non-conflicting class names", () => {
    expect(cn("flex", "items-center", ["gap-2", null])).toBe("flex items-center gap-2")
  })
})
