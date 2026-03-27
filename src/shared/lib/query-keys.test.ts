import { describe, expect, it } from "vitest"
import { queryKeys } from "@/shared/lib/query-keys"

describe("queryKeys", () => {
  it("creates a stable explorer key", () => {
    expect(queryKeys.explorer("scope-a", "demo", "path/to/file")).toEqual([
      "scope",
      "scope-a",
      "explorer",
      "demo",
      "path/to/file",
    ])
  })
})
