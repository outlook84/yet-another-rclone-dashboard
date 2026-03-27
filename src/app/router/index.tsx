import { Suspense, lazy, type ReactNode } from "react"
import { createHashRouter, RouterProvider } from "react-router-dom"
import { RootLayout } from "@/app/layout/root-layout"
import { LoadingState } from "@/shared/components/loading-state"
import { useI18n } from "@/shared/i18n"

const ConnectPage = lazy(() =>
  import("@/features/auth/pages/connect-page").then((module) => ({
    default: module.ConnectPage,
  })),
)
const OverviewPage = lazy(() =>
  import("@/features/overview/pages/overview-page").then((module) => ({
    default: module.OverviewPage,
  })),
)
const RemotesPage = lazy(() =>
  import("@/features/remotes/pages/remotes-page").then((module) => ({
    default: module.RemotesPage,
  })),
)
const ExplorerPage = lazy(() =>
  import("@/features/explorer/pages/explorer-page").then((module) => ({
    default: module.ExplorerPage,
  })),
)
const JobsPage = lazy(() =>
  import("@/features/jobs/pages/jobs-page").then((module) => ({
    default: module.JobsPage,
  })),
)
const SettingsPage = lazy(() =>
  import("@/features/settings/pages/settings-page").then((module) => ({
    default: module.SettingsPage,
  })),
)
const NotFoundPage = lazy(() =>
  import("@/shared/components/not-found-page").then((module) => ({
    default: module.NotFoundPage,
  })),
)

function RouteFallback() {
  const { messages } = useI18n()
  return <LoadingState message={messages.common.loadingPage()} />
}

function withSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

const router = createHashRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      { index: true, element: withSuspense(<ConnectPage />) },
      { path: "overview", element: withSuspense(<OverviewPage />) },
      { path: "remotes", element: withSuspense(<RemotesPage />) },
      { path: "explorer", element: withSuspense(<ExplorerPage />) },
      { path: "jobs", element: withSuspense(<JobsPage />) },
      { path: "settings", element: withSuspense(<SettingsPage />) },
      { path: "*", element: withSuspense(<NotFoundPage />) },
    ],
  },
])

function AppRouter() {
  return <RouterProvider router={router} />
}

export { AppRouter }
