import { AppProviders } from "@/app/providers/app-providers"
import { AppRouter } from "@/app/router"

function App() {
  return (
    <AppProviders>
      <AppRouter />
    </AppProviders>
  )
}

export { App }
