import { useEffect, type PropsWithChildren } from "react"
import { initializeThemeDocument, resolveTheme, useThemeStore } from "@/shared/store/theme-store"

function ThemeProvider({ children }: PropsWithChildren) {
  const mode = useThemeStore((state) => state.mode)
  const systemTheme = useThemeStore((state) => state.systemTheme)
  const setSystemTheme = useThemeStore((state) => state.setSystemTheme)

  useEffect(() => {
    initializeThemeDocument()

    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined
    }

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = () => {
      setSystemTheme(mediaQuery.matches ? "dark" : "light")
    }

    handleChange()
    mediaQuery.addEventListener("change", handleChange)

    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [setSystemTheme])

  useEffect(() => {
    const resolvedTheme = resolveTheme(mode, systemTheme)
    document.documentElement.dataset.theme = resolvedTheme
    document.documentElement.style.colorScheme = resolvedTheme === "dark" ? "dark" : "light"
  }, [mode, systemTheme])

  return children
}

export { ThemeProvider }
