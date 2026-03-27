import { useMemo } from "react"
import { useConnectionStore } from "@/shared/store/connection-store"

function useConnectionScope() {
  const baseUrl = useConnectionStore((state) => state.baseUrl)
  const authMode = useConnectionStore((state) => state.authMode)
  const username = useConnectionStore((state) => state.basicCredentials.username)
  const apiBaseUrl = useConnectionStore((state) => state.lastServerInfo?.apiBaseUrl)

  return useMemo(() => {
    const endpoint = apiBaseUrl ?? baseUrl
    return `${endpoint}::${authMode}::${authMode === "basic" ? username : "anonymous"}`
  }, [apiBaseUrl, authMode, baseUrl, username])
}

export { useConnectionScope }
