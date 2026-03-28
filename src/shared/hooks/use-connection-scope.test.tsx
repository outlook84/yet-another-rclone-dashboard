// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook } from "@testing-library/react"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { useConnectionStore } from "@/shared/store/connection-store"

describe("useConnectionScope", () => {
  beforeEach(() => {
    vi.resetModules()
    useConnectionStore.setState({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
    })
  })

  it("uses the validated api base url when available", () => {
    useConnectionStore.setState({
      authMode: "basic",
      basicCredentials: {
        username: "alice",
        password: "secret",
      },
      lastValidatedAt: "2026-03-28T10:00:00.000Z",
      lastServerInfo: {
        product: "rclone",
        apiBaseUrl: "https://demo.example.com/rc",
      },
    })

    const { result } = renderHook(() => useConnectionScope())

    expect(result.current).toBe("https://demo.example.com/rc::basic::alice")
  })

  it("falls back to the configured base url and anonymous scope for no auth", () => {
    useConnectionStore.setState({
      authMode: "none",
      basicCredentials: {
        username: "ignored",
        password: "",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
    })

    const { result } = renderHook(() => useConnectionScope())

    expect(result.current).toBe("http://localhost:5572::none::anonymous")
  })
})
