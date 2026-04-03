// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

function mockMatchMedia(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as typeof window.matchMedia
}

describe("theme-store", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    document.documentElement.removeAttribute("data-theme")
    document.documentElement.style.colorScheme = ""
    document.head.innerHTML = '<meta name="theme-color" content="#f5f7fb">'
    mockMatchMedia(false)
  })

  it("initializes from system theme when mode is system", async () => {
    const themeStore = await import("@/shared/store/theme-store")

    themeStore.initializeThemeDocument()

    expect(document.documentElement.dataset.theme).toBe("light")
    expect(document.documentElement.style.colorScheme).toBe("light")
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      themeStore.THEME_COLORS.light,
    )
  })

  it("persists vivid mode and uses light color scheme for vivid controls", async () => {
    const themeStore = await import("@/shared/store/theme-store")

    themeStore.useThemeStore.getState().setMode("vivid")

    expect(window.localStorage.getItem(themeStore.THEME_STORAGE_KEY)).toBe("vivid")
    expect(document.documentElement.dataset.theme).toBe("vivid")
    expect(document.documentElement.style.colorScheme).toBe("light")
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      themeStore.THEME_COLORS.vivid,
    )
  })

  it("resolves system mode to dark when the OS prefers dark", async () => {
    mockMatchMedia(true)
    const themeStore = await import("@/shared/store/theme-store")

    themeStore.useThemeStore.getState().setSystemTheme("dark")

    expect(themeStore.resolveTheme("system", "dark")).toBe("dark")
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe(
      themeStore.THEME_COLORS.dark,
    )
  })
})
