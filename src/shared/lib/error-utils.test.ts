import { describe, expect, it, vi } from "vitest"
import { BackendUnavailableError } from "@/shared/api/contracts/errors"
import type { AppMessages } from "@/shared/i18n/messages"
import { toErrorMessage } from "@/shared/lib/error-utils"

const commonMessages = {
  errorTimeout: vi.fn(() => "Request timed out"),
  errorNetwork: vi.fn(() => "Network unavailable"),
  unknownError: vi.fn(() => "Unknown from i18n"),
} as unknown as AppMessages["common"]

describe("toErrorMessage", () => {
  it("maps backend availability errors to localized messages", () => {
    expect(
      toErrorMessage(
        new BackendUnavailableError("timeout", {
          code: "timeout",
          type: "timeout",
        }),
        { ...commonMessages },
      ),
    ).toBe("Request timed out")

    expect(
      toErrorMessage(
        new BackendUnavailableError("network", {
          code: "network",
          type: "network",
        }),
        { ...commonMessages },
      ),
    ).toBe("Network unavailable")
  })

  it("prefers structured cause messages before the outer error message", () => {
    const withApiError = new Error("outer")
    withApiError.cause = { error: "backend says no" }
    expect(toErrorMessage(withApiError)).toBe("backend says no")

    const withCauseMessage = new Error("outer")
    withCauseMessage.cause = { message: "inner message" }
    expect(toErrorMessage(withCauseMessage)).toBe("inner message")
  })

  it("falls back to the original message or unknown error text", () => {
    expect(toErrorMessage(new Error("plain message"))).toBe("plain message")
    expect(toErrorMessage("not-an-error", { ...commonMessages })).toBe("Unknown from i18n")
    expect(toErrorMessage(null, undefined, "Fallback text")).toBe("Fallback text")
  })
})
