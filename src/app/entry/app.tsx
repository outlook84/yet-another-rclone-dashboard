import { AppProviders } from "@/app/providers/app-providers"
import { AppRouter } from "@/app/router"
import { PwaUpdateBanner } from "@/shared/pwa/pwa-update-banner"

function App() {
  return (
    <AppProviders>
      <AppRouter />
      <PwaUpdateBanner />
    </AppProviders>
  )
}

export { App }
