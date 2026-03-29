import { QueryClientProvider } from "@tanstack/react-query"
import type { PropsWithChildren } from "react"
import { SharedStatsRuntime } from "@/features/jobs/components/shared-stats-runtime"
import { AppApiProvider } from "@/shared/api/client/api-context"
import { ConfirmProvider } from "@/shared/components/confirm-provider"
import { NotificationProvider } from "@/shared/components/notification-provider"
import { I18nProvider } from "@/shared/i18n"
import { ThemeProvider } from "@/shared/components/theme-provider"
import { appQueryClient } from "@/app/providers/app-query-client"

function AppProviders({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={appQueryClient}>
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
