import { create } from "zustand"

type AppLocale = "en" | "zh-CN"

const LOCALE_STORAGE_KEY = "yard-locale"
const supportedLocales: AppLocale[] = ["en", "zh-CN"]

interface LocaleState {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
}

function isSupportedLocale(value: string | null): value is AppLocale {
  return value === "en" || value === "zh-CN"
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

function readStoredLocale(): AppLocale {
  if (typeof window === "undefined") {
    return "en"
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY)
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
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    }

    applyLocale(locale)
    set({ locale })
  },
}))

function initializeLocaleDocument() {
  applyLocale(initialLocale)
}

export { initializeLocaleDocument, LOCALE_STORAGE_KEY, supportedLocales, type AppLocale, useLocaleStore }
