import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import type { AppApiClient } from "@/shared/api/contracts/app"
import { createRcloneRcAppApiClient } from "@/shared/api/client/app-api-client"
import { useConnectionStore } from "@/shared/store/connection-store"

const AppApiContext = createContext<AppApiClient | null>(null)

function AppApiProvider({ children }: PropsWithChildren) {
  const baseUrl = useConnectionStore((state) => state.baseUrl)
  const authMode = useConnectionStore((state) => state.authMode)
  const basicCredentials = useConnectionStore((state) => state.basicCredentials)
  const validationRevision = useConnectionStore((state) => state.validationRevision)

  const client = useMemo(
    () =>
      createRcloneRcAppApiClient({
        baseUrl,
        authMode,
        basicCredentials,
      }),
    [authMode, baseUrl, basicCredentials, validationRevision],
  )

  return <AppApiContext.Provider value={client}>{children}</AppApiContext.Provider>
}

function useAppApi() {
  const value = useContext(AppApiContext)

  if (!value) {
    throw new Error("AppApiProvider is missing from the component tree")
  }

  return value
}

// eslint-disable-next-line react-refresh/only-export-components
export { AppApiProvider, useAppApi }
