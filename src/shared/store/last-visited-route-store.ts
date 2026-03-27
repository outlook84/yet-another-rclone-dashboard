import { create } from "zustand"
import { persist } from "zustand/middleware"

const DEFAULT_ROUTE = "/overview"

interface LastVisitedRouteState {
  routeByScope: Record<string, string>
  setLastVisitedRoute: (scope: string, route: string) => void
  getLastVisitedRoute: (scope: string) => string
}

const isRestorableRoute = (route: string) =>
  route === "/overview" ||
  route === "/remotes" ||
  route === "/explorer" ||
  route === "/jobs" ||
  route === "/settings"

const useLastVisitedRouteStore = create<LastVisitedRouteState>()(
  persist(
    (set, get) => ({
      routeByScope: {},
      setLastVisitedRoute: (scope, route) => {
        if (!scope || !isRestorableRoute(route)) {
          return
        }

        set((state) => ({
          routeByScope:
            state.routeByScope[scope] === route
              ? state.routeByScope
              : {
                  ...state.routeByScope,
                  [scope]: route,
                },
        }))
      },
      getLastVisitedRoute: (scope) => {
        if (!scope) {
          return DEFAULT_ROUTE
        }

        const route = get().routeByScope[scope]
        return isRestorableRoute(route) ? route : DEFAULT_ROUTE
      },
    }),
    {
      name: "yard-last-visited-route",
    },
  ),
)

export { DEFAULT_ROUTE, useLastVisitedRouteStore }
