// @vitest-environment jsdom

import { readFileSync } from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

const INDEX_HTML_PATH = path.resolve(import.meta.dirname, "../../../index.html")
const indexHtml = readFileSync(INDEX_HTML_PATH, "utf-8")
const indexHtmlDocument = new DOMParser().parseFromString(indexHtml, "text/html")
const bootstrapScript = Array.from(indexHtmlDocument.querySelectorAll("script"))
  .find((script) => !script.src && script.textContent?.includes("yard-theme-mode"))
  ?.textContent

if (!bootstrapScript) {
  throw new Error("Could not find inline theme bootstrap script in index.html")
}

const inlineBootstrapScript = bootstrapScript

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

function setHeadShell() {
  document.documentElement.innerHTML = `
    <head>
      <meta name="theme-color" content="#f5f7fb">
    </head>
    <body></body>
  `
}

function runBootstrap() {
  window.eval(inlineBootstrapScript)
}

describe("index.html theme bootstrap", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    window.localStorage.clear()
    setHeadShell()
    mockMatchMedia(false)
  })

  it("applies a stored vivid theme before the app boots", () => {
    window.localStorage.setItem("yard-theme-mode", "vivid")

    runBootstrap()

    expect(document.documentElement.dataset.theme).toBe("vivid")
    expect(document.documentElement.style.colorScheme).toBe("light")
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#ffd3bf")
  })

  it("resolves system mode from prefers-color-scheme during bootstrap", () => {
    window.localStorage.setItem("yard-theme-mode", "system")
    mockMatchMedia(true)

    runBootstrap()

    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#111821")
  })

  it("falls back to system theme when storage access is denied", () => {
    const localStorageGetter = vi.spyOn(window, "localStorage", "get")
    localStorageGetter.mockImplementation(() => {
      throw new DOMException("Denied", "SecurityError")
    })
    mockMatchMedia(true)

    expect(runBootstrap).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe("dark")
    expect(document.documentElement.style.colorScheme).toBe("dark")
    expect(document.querySelector('meta[name="theme-color"]')?.getAttribute("content")).toBe("#111821")
  })
})
