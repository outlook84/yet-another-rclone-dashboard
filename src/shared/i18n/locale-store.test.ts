// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

describe("locale-store", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.resetModules()
    window.localStorage.clear()
    document.documentElement.removeAttribute("lang")
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("uses a supported stored locale during initialization", async () => {
    window.localStorage.setItem("yard-locale", "zh-CN")

    const localeStore = await import("@/shared/i18n/locale-store")

    expect(localeStore.useLocaleStore.getState().locale).toBe("zh-CN")
    localeStore.initializeLocaleDocument()
    expect(document.documentElement.lang).toBe("zh-CN")
  })

  it("normalizes the browser locale and persists explicit locale changes", async () => {
    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "zh-TW",
    })

    const localeStore = await import("@/shared/i18n/locale-store")

    expect(localeStore.useLocaleStore.getState().locale).toBe("zh-CN")

    localeStore.useLocaleStore.getState().setLocale("en")

    expect(window.localStorage.length).toBe(1)
    expect(window.localStorage.getItem(window.localStorage.key(0)!)).toBe("en")
    expect(document.documentElement.lang).toBe("en")
    expect(localeStore.useLocaleStore.getState().locale).toBe("en")
  })

  it("falls back when localStorage is replaced with an incomplete mock", async () => {
    vi.spyOn(window, "localStorage", "get").mockReturnValue({} as Storage)

    Object.defineProperty(window.navigator, "language", {
      configurable: true,
      value: "zh-HK",
    })

    const localeStore = await import("@/shared/i18n/locale-store")

    expect(localeStore.useLocaleStore.getState().locale).toBe("zh-CN")

    expect(() => localeStore.useLocaleStore.getState().setLocale("en")).not.toThrow()
    expect(localeStore.useLocaleStore.getState().locale).toBe("en")
  })
})
