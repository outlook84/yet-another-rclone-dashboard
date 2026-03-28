// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("locale-store", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
    document.documentElement.removeAttribute("lang")
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

    expect(window.localStorage.getItem(localeStore.LOCALE_STORAGE_KEY)).toBe("en")
    expect(document.documentElement.lang).toBe("en")
    expect(localeStore.useLocaleStore.getState().locale).toBe("en")
  })
})
