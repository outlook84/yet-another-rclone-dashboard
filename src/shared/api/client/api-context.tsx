import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import type { AppApiClient } from "@/shared/api/contracts/app"
import { createRcloneRcAppApiClient } from "@/shared/api/client/app-api-client"
import { messages as appMessages } from "@/shared/i18n/messages"
import { useLocaleStore } from "@/shared/i18n/locale-store"
import { useConnectionStore } from "@/shared/store/connection-store"

const AppApiContext = createContext<AppApiClient | null>(null)

function AppApiProvider({ children }: PropsWithChildren) {
  const baseUrl = useConnectionStore((state) => state.baseUrl)
  const authMode = useConnectionStore((state) => state.authMode)
  const basicCredentials = useConnectionStore((state) => state.basicCredentials)
  const locale = useLocaleStore((state) => state.locale)
  const messages = appMessages[locale]

  const client = useMemo(
    () =>
      createRcloneRcAppApiClient({
        baseUrl,
        authMode,
        basicCredentials,
        invalidRemoteNameMessage: messages.remotes.invalidRemoteName(),
      }),
    [authMode, baseUrl, basicCredentials, messages.remotes],
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
