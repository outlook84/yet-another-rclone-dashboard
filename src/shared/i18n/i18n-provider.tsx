import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { messages } from "@/shared/i18n/messages"
import { type AppLocale, useLocaleStore } from "@/shared/i18n/locale-store"

type I18nContextValue = {
  locale: AppLocale
  setLocale: (locale: AppLocale) => void
  messages: (typeof messages)[AppLocale]
}

const I18nContext = createContext<I18nContextValue | null>(null)

function I18nProvider({ children }: PropsWithChildren) {
  const locale = useLocaleStore((state) => state.locale)
  const setLocale = useLocaleStore((state) => state.setLocale)

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale,
      messages: messages[locale],
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

function useI18n() {
  const value = useContext(I18nContext)

  if (!value) {
    throw new Error("I18nProvider is missing from the component tree")
  }

  return value
}

// eslint-disable-next-line react-refresh/only-export-components
export { I18nProvider, useI18n }
