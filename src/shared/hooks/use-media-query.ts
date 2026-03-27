import { useEffect, useState } from "react"

function useMediaQuery(query: string) {
  const getMatch = () => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return false
    }

    return window.matchMedia(query).matches
  }

  const [matches, setMatches] = useState(getMatch)

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) {
      return undefined
    }

    const mediaQuery = window.matchMedia(query)
    const handleChange = () => {
      setMatches(mediaQuery.matches)
    }

    handleChange()
    mediaQuery.addEventListener("change", handleChange)
    return () => {
      mediaQuery.removeEventListener("change", handleChange)
    }
  }, [query])

  return matches
}

export { useMediaQuery }
