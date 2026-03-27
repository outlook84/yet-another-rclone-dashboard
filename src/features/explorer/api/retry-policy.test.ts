import { describe, expect, it } from "vitest"
import { shouldRetryExplorerQuery } from "@/features/explorer/api/retry-policy"
import { AppApiError, BackendUnavailableError } from "@/shared/api/contracts/errors"

describe("shouldRetryExplorerQuery", () => {
  it("does not retry timeout errors", () => {
    const error = new BackendUnavailableError("timeout", {
      code: "backend_unavailable",
      type: "timeout",
    })

    expect(shouldRetryExplorerQuery(0, error)).toBe(false)
  })

  it("does not retry auth and not found errors", () => {
    expect(
      shouldRetryExplorerQuery(
        0,
        new AppApiError("forbidden", { code: "forbidden", status: 403 }),
      ),
    ).toBe(false)

    expect(
      shouldRetryExplorerQuery(
        0,
        new AppApiError("not found", { code: "not_found", status: 404 }),
      ),
    ).toBe(false)
  })

  it("retries other errors until the third failure", () => {
    expect(shouldRetryExplorerQuery(0, new Error("boom"))).toBe(true)
    expect(shouldRetryExplorerQuery(2, new Error("boom"))).toBe(true)
    expect(shouldRetryExplorerQuery(3, new Error("boom"))).toBe(false)
  })
})
