import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render } from "@testing-library/react"
import type { ReactNode } from "react"
import { AppApiProvider } from "@/shared/api/client/api-context"
import { ConfirmProvider } from "@/shared/components/confirm-provider"
import { NotificationProvider } from "@/shared/components/notification-provider"
import { I18nProvider } from "@/shared/i18n"
import { useLocaleStore } from "@/shared/i18n"

function renderWithProviders(ui: ReactNode) {
  if (!window.matchMedia) {
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })) as typeof window.matchMedia
  }

  if (!window.ResizeObserver) {
    class ResizeObserverMock {
      observe() {}
      unobserve() {}
      disconnect() {}
    }

    window.ResizeObserver = ResizeObserverMock as typeof window.ResizeObserver
  }

  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  })

  useLocaleStore.getState().setLocale("en")

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <NotificationProvider>
          <ConfirmProvider>
            <AppApiProvider>{ui}</AppApiProvider>
          </ConfirmProvider>
        </NotificationProvider>
      </I18nProvider>
    </QueryClientProvider>,
  )
}

export { renderWithProviders }
