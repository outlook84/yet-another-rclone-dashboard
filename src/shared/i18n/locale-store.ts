import { create } from "zustand"

type AppLocale = "en" | "zh-CN"

const LOCALE_STORAGE_KEY = "yard-locale"
const supportedLocales: AppLocale[] = ["en", "zh-CN"]

interface LocaleState {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

function isSupportedLocale(value: string | null): value is AppLocale {
  return supportedLocales.some((locale) => locale === value)
}

function normalizeLocale(value?: string | null): AppLocale {
  if (!value) {
    return "en"
  }

  if (value.toLowerCase().startsWith("zh")) {
    return "zh-CN"
  }

  return "en"
}

function getLocalStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return window.localStorage
  } catch {
    return null
  }
}

function readStoredLocaleValue(): string | null {
  const storage = getLocalStorage()
  if (!storage || typeof storage.getItem !== "function") {
    return null
  }

  try {
    return storage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredLocaleValue(locale: AppLocale) {
  const storage = getLocalStorage()
  if (!storage || typeof storage.setItem !== "function") {
    return
  }

  try {
    storage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Ignore storage failures so locale changes still update the active document.
  }
}

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en"
  }

  const storedLocale = readStoredLocaleValue()
  if (isSupportedLocale(storedLocale)) {
    return storedLocale
  }

  return normalizeLocale(window.navigator.language)
}

function applyLocale(locale: AppLocale) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.lang = locale
}

const initialLocale = readStoredLocale()

const useLocaleStore = create<LocaleState>((set) => ({
  locale: initialLocale,
  setLocale: (locale) => {
    writeStoredLocaleValue(locale)
    applyLocale(locale)
    set({ locale })
  },
}))

function initializeLocaleDocument() {
  applyLocale(initialLocale)
}

export { initializeLocaleDocument, type AppLocale, useLocaleStore }
