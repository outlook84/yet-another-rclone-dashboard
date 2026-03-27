import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { SharedStatsRuntime } from "@/features/jobs/components/shared-stats-runtime"
import { AppApiProvider } from "@/shared/api/client/api-context"
import { ConfirmProvider } from "@/shared/components/confirm-provider"
import { NotificationProvider } from "@/shared/components/notification-provider"
import { I18nProvider } from "@/shared/i18n"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { AppApiError } from "@/shared/api/contracts/errors"

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        if (error instanceof AppApiError) {
          if (error.status === 401 || error.status === 403 || error.status === 404) {
            return false
          }
        }

        return failureCount < 3
      },
    },
  },
})

function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <ThemeProvider>
          <NotificationProvider>
            <ConfirmProvider>
              <AppApiProvider>
                <SharedStatsRuntime />
                {children}
              </AppApiProvider>
            </ConfirmProvider>
          </NotificationProvider>
        </ThemeProvider>
      </I18nProvider>
    </QueryClientProvider>
  )
}

export { AppProviders }
