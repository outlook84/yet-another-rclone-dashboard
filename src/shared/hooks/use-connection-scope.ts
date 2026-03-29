import { useMemo } from "react"
import type { AuthMode } from "@/shared/api/contracts/auth"
import { useConnectionStore } from "@/shared/store/connection-store"

function buildConnectionScope(input: {
  baseUrl: string
  authMode: AuthMode
  username: string
  apiBaseUrl?: string | null
}) {
  const endpoint = input.apiBaseUrl ?? input.baseUrl
  return `${endpoint}::${input.authMode}::${input.authMode === "basic" ? input.username : "anonymous"}`
}

function useConnectionScope() {
  const baseUrl = useConnectionStore((state) => state.baseUrl)
  const authMode = useConnectionStore((state) => state.authMode)
  const username = useConnectionStore((state) => state.basicCredentials.username)
  const apiBaseUrl = useConnectionStore((state) => state.lastServerInfo?.apiBaseUrl)

  return useMemo(() => {
    return buildConnectionScope({
      baseUrl,
      authMode,
      username,
      apiBaseUrl,
    })
  }, [apiBaseUrl, authMode, baseUrl, username])
}

export { buildConnectionScope, useConnectionScope }
