// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ServerInfo } from "@/shared/api/contracts/session"

const serverInfo: ServerInfo = {
  product: "rclone",
  version: "1.68.0",
  apiBaseUrl: "http://localhost:5572",
  serverTime: "2026-03-28T01:00:00.000Z",
}

describe("useConnectionStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("starts with the expected default connection", async () => {
    const { useConnectionStore } = await import("@/shared/store/connection-store")

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: window.location.origin,
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "",
      },
      syncEnabled: false,
      uploadEnabled: false,
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 0,
    })
  })

  it("includes the browser pathname prefix in the default base url", async () => {
    window.history.replaceState({}, "", "/rclone/")

    const { useConnectionStore } = await import("@/shared/store/connection-store")

    expect(useConnectionStore.getState().baseUrl).toBe(`${window.location.origin}/rclone`)
  })

  it("backfills missing persisted capabilities from the active saved profile", async () => {
    window.localStorage.setItem(
      "yard-connection",
      JSON.stringify({
        state: {
          baseUrl: "https://legacy.example.com/rc",
          authMode: "basic",
          basicCredentials: {
            username: "legacy",
            password: "pw",
          },
        },
        version: 0,
      }),
    )
    window.localStorage.setItem(
      "yard-saved-connections",
      JSON.stringify({
        state: {
          selectedProfileId: "legacy-profile",
          profiles: [
            {
              id: "legacy-profile",
              name: "Legacy",
              baseUrl: "https://legacy.example.com/rc",
              authMode: "basic",
              basicCredentials: {
                username: "legacy",
                password: "pw",
              },
              syncEnabled: true,
              uploadEnabled: false,
              updatedAt: "2026-03-29T00:00:00.000Z",
            },
          ],
        },
        version: 0,
      }),
    )

    const { useConnectionStore } = await import("@/shared/store/connection-store")

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "https://legacy.example.com/rc",
      authMode: "basic",
      basicCredentials: {
        username: "legacy",
        password: "pw",
      },
      syncEnabled: true,
      uploadEnabled: false,
    })
  })

  it("keeps missing persisted capabilities disabled without a matching active saved profile", async () => {
    window.localStorage.setItem(
      "yard-connection",
      JSON.stringify({
        state: {
          baseUrl: "https://legacy.example.com/rc",
          authMode: "basic",
          basicCredentials: {
            username: "legacy",
            password: "pw",
          },
        },
        version: 0,
      }),
    )
    window.localStorage.setItem(
      "yard-saved-connections",
      JSON.stringify({
        state: {
          activeProfileId: "other-profile",
          profiles: [
            {
              id: "other-profile",
              name: "Other",
              baseUrl: "https://other.example.com/rc",
              authMode: "basic",
              basicCredentials: {
                username: "legacy",
                password: "pw",
              },
              syncEnabled: true,
              uploadEnabled: true,
              updatedAt: "2026-03-29T00:00:00.000Z",
            },
          ],
        },
        version: 0,
      }),
    )

    const { useConnectionStore } = await import("@/shared/store/connection-store")

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "https://legacy.example.com/rc",
      syncEnabled: false,
      uploadEnabled: false,
    })
  })

  it("drops legacy persisted validation runtime when hydrating", async () => {
    window.localStorage.setItem(
      "yard-connection",
      JSON.stringify({
        state: {
          baseUrl: "https://legacy.example.com/rc",
          authMode: "basic",
          basicCredentials: {
            username: "legacy",
            password: "pw",
          },
          syncEnabled: true,
          uploadEnabled: true,
          lastValidatedAt: "2026-03-29T00:00:00.000Z",
          lastServerInfo: {
            product: "rclone",
            version: "1.70.0",
            apiBaseUrl: "https://legacy.example.com/rc",
            serverTime: "2026-03-29T00:00:00.000Z",
          },
          validationRevision: 12,
        },
        version: 0,
      }),
    )

    const { useConnectionStore } = await import("@/shared/store/connection-store")

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "https://legacy.example.com/rc",
      syncEnabled: true,
      uploadEnabled: true,
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 0,
    })
  })

  it("persists config but drops validation runtime on module reload", async () => {
    window.history.replaceState({}, "", "/")

    const firstModule = await import("@/shared/store/connection-store")

    firstModule.useConnectionStore.getState().applyConnection({
      baseUrl: "https://demo.example.com/rc",
      authMode: "none",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
      syncEnabled: true,
      uploadEnabled: true,
    })
    firstModule.useConnectionStore.getState().markValidated({
      ...serverInfo,
      apiBaseUrl: "https://demo.example.com/rc",
    })

    vi.resetModules()

    const reloadedModule = await import("@/shared/store/connection-store")

    expect(reloadedModule.useConnectionStore.getState()).toMatchObject({
      baseUrl: "https://demo.example.com/rc",
      authMode: "none",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
      syncEnabled: true,
      uploadEnabled: true,
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 0,
    })
  })

  it("resets validation when applying a new connection config", async () => {
    const { useConnectionStore } = await import("@/shared/store/connection-store")

    useConnectionStore.getState().markValidated(serverInfo)
    useConnectionStore.getState().applyConnection({
      baseUrl: "https://demo.example.com",
      authMode: "basic",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
      syncEnabled: true,
      uploadEnabled: false,
    })

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "https://demo.example.com",
      authMode: "basic",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
      syncEnabled: true,
      uploadEnabled: false,
      lastValidatedAt: null,
      lastServerInfo: null,
    })
  })

  it("tracks validation metadata only at runtime", async () => {
    const { useConnectionStore } = await import("@/shared/store/connection-store")

    expect(useConnectionStore.getState().validationRevision).toBe(0)

    useConnectionStore.getState().markValidated(serverInfo)
    const lastValidatedAt = useConnectionStore.getState().lastValidatedAt

    expect(useConnectionStore.getState()).toMatchObject({
      lastValidatedAt: expect.any(String),
      lastServerInfo: serverInfo,
      validationRevision: 1,
    })

    useConnectionStore.getState().setServerInfo({
      ...serverInfo,
      version: "1.69.0",
    })

    expect(useConnectionStore.getState()).toMatchObject({
      lastValidatedAt,
      validationRevision: 1,
      lastServerInfo: {
        ...serverInfo,
        version: "1.69.0",
      },
    })

    useConnectionStore.getState().clearValidation()

    expect(useConnectionStore.getState()).toMatchObject({
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 1,
    })
  })
})
