import { create } from "zustand"

const THEME_STORAGE_KEY = "yard-theme-mode"

type ThemeMode = "system" | "light" | "dark" | "vivid"
type ResolvedTheme = "light" | "dark" | "vivid"

interface ThemeState {
  mode: ThemeMode
  systemTheme: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  setSystemTheme: (systemTheme: ResolvedTheme) => void
}

function isThemeMode(value: string | null): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark" || value === "vivid"
}

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || !window.matchMedia) {
    return "light"
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function readStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system"
  }

  const storedThemeMode = window.localStorage.getItem(THEME_STORAGE_KEY)
  return isThemeMode(storedThemeMode) ? storedThemeMode : "system"
}

function resolveTheme(mode: ThemeMode, systemTheme: ResolvedTheme): ResolvedTheme {
  return mode === "system" ? systemTheme : mode
}

function applyResolvedTheme(theme: ResolvedTheme) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.dataset.theme = theme
  document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light"
}

function syncTheme(mode: ThemeMode, systemTheme: ResolvedTheme) {
  applyResolvedTheme(resolveTheme(mode, systemTheme))
}

const initialMode = readStoredThemeMode()
const initialSystemTheme = getSystemTheme()

const useThemeStore = create<ThemeState>((set, get) => ({
  mode: initialMode,
  systemTheme: initialSystemTheme,
  setMode: (mode) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(THEME_STORAGE_KEY, mode)
    }

    set({ mode })
    syncTheme(mode, get().systemTheme)
  },
  setSystemTheme: (systemTheme) => {
    set({ systemTheme })
    syncTheme(get().mode, systemTheme)
  },
}))

function initializeThemeDocument() {
  syncTheme(initialMode, initialSystemTheme)
}

export {
  initializeThemeDocument,
  resolveTheme,
  type ResolvedTheme,
  THEME_STORAGE_KEY,
  type ThemeMode,
  useThemeStore,
}
