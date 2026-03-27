// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest"
import { DEFAULT_ROUTE, useLastVisitedRouteStore } from "@/shared/store/last-visited-route-store"

describe("useLastVisitedRouteStore", () => {
  beforeEach(() => {
    useLastVisitedRouteStore.setState({
      routeByScope: {},
    })
  })

  it("stores routes per scope", () => {
    useLastVisitedRouteStore.getState().setLastVisitedRoute("profile-a", "/explorer")
    useLastVisitedRouteStore.getState().setLastVisitedRoute("profile-b", "/jobs")

    expect(useLastVisitedRouteStore.getState().getLastVisitedRoute("profile-a")).toBe("/explorer")
    expect(useLastVisitedRouteStore.getState().getLastVisitedRoute("profile-b")).toBe("/jobs")
  })

  it("falls back to the default route for unknown or invalid routes", () => {
    useLastVisitedRouteStore.getState().setLastVisitedRoute("profile-a", "/")
    useLastVisitedRouteStore.getState().setLastVisitedRoute("profile-b", "/not-found")

    expect(useLastVisitedRouteStore.getState().getLastVisitedRoute("profile-a")).toBe(DEFAULT_ROUTE)
    expect(useLastVisitedRouteStore.getState().getLastVisitedRoute("profile-b")).toBe(DEFAULT_ROUTE)
    expect(useLastVisitedRouteStore.getState().getLastVisitedRoute("missing")).toBe(DEFAULT_ROUTE)
  })
})
