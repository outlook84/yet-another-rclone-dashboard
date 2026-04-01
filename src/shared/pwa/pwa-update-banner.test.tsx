// @vitest-environment jsdom

import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

class MockServiceWorker extends EventTarget {
  state: ServiceWorkerState = "installing"
  postMessage = vi.fn()

  setState(state: ServiceWorkerState) {
    this.state = state
    this.dispatchEvent(new Event("statechange"))
  }
}

class MockServiceWorkerRegistration extends EventTarget {
  waiting: ServiceWorker | null = null
  installing: ServiceWorker | null = null
  update = vi.fn().mockResolvedValue(undefined)
}

class MockServiceWorkerContainer extends EventTarget {
  controller: ServiceWorker | null = null
  register = vi.fn<(_: string) => Promise<ServiceWorkerRegistration>>()
}

describe("PwaUpdateBanner", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.restoreAllMocks()
    vi.stubGlobal("__APP_BUILD_ID__", "test-build")
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("shows the update banner for an installed waiting worker and reloads after activation", async () => {
    const registration = new MockServiceWorkerRegistration()
    const installingWorker = new MockServiceWorker()
    const serviceWorkerContainer = new MockServiceWorkerContainer()

    registration.installing = installingWorker as unknown as ServiceWorker
    serviceWorkerContainer.controller = {} as ServiceWorker
    serviceWorkerContainer.register.mockResolvedValue(registration as unknown as ServiceWorkerRegistration)

    Object.defineProperty(window.navigator, "serviceWorker", {
      configurable: true,
      value: serviceWorkerContainer,
    })

    const { pwaRuntime, registerPwa } = await import("@/shared/pwa/pwa-manager")
    const { PwaUpdateBanner } = await import("@/shared/pwa/pwa-update-banner")
    const { renderWithProviders } = await import("@/test/render-with-providers")
    vi.spyOn(pwaRuntime, "isDev").mockReturnValue(false)
    const reloadMock = vi.spyOn(pwaRuntime, "reloadPage").mockImplementation(() => undefined)

    renderWithProviders(<PwaUpdateBanner />)

    registerPwa()
    window.dispatchEvent(new Event("load"))

    await waitFor(() => {
      expect(serviceWorkerContainer.register).toHaveBeenCalled()
      expect(registration.update).toHaveBeenCalled()
    })

    installingWorker.setState("installed")

    expect(await screen.findByText("Update available")).not.toBeNull()
    expect(screen.getByText("A newer dashboard build has been installed and is ready to use.")).not.toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Refresh now" }))

    expect(installingWorker.postMessage).toHaveBeenCalledWith({ type: "SKIP_WAITING" })

    serviceWorkerContainer.dispatchEvent(new Event("controllerchange"))

    expect(reloadMock).toHaveBeenCalledTimes(1)
  })
})
