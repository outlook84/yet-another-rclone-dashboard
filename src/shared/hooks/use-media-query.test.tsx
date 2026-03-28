// @vitest-environment jsdom

import { act, renderHook } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useMediaQuery } from "@/shared/hooks/use-media-query"

type MatchMediaController = {
  setMatches: (value: boolean) => void
}

function mockMatchMedia(initialMatches: boolean): MatchMediaController {
  let matches = initialMatches
  const listeners = new Set<() => void>()

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    get matches() {
      return matches
    },
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") {
        listeners.add(listener)
      }
    }),
    removeEventListener: vi.fn((event: string, listener: () => void) => {
      if (event === "change") {
        listeners.delete(listener)
      }
    }),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia

  return {
    setMatches(value) {
      matches = value
      listeners.forEach((listener) => listener())
    },
  }
}

describe("useMediaQuery", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it("reads the current media query match on mount", () => {
    mockMatchMedia(true)

    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"))

    expect(result.current).toBe(true)
  })

  it("updates when the media query match changes", () => {
    const controller = mockMatchMedia(false)
    const { result } = renderHook(() => useMediaQuery("(min-width: 768px)"))

    expect(result.current).toBe(false)

    act(() => {
      controller.setMatches(true)
    })

    expect(result.current).toBe(true)
  })
})
