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
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
    })
  })

  it("clears validation when connection settings change", async () => {
    const { useConnectionStore } = await import("@/shared/store/connection-store")

    useConnectionStore.getState().markValidated(serverInfo)
    expect(useConnectionStore.getState().lastServerInfo).toEqual(serverInfo)
    expect(useConnectionStore.getState().lastValidatedAt).toEqual(expect.any(String))

    useConnectionStore.getState().setBaseUrl("http://localhost:5573")

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "http://localhost:5573",
      lastValidatedAt: null,
      lastServerInfo: null,
    })

    useConnectionStore.getState().markValidated(serverInfo)
    useConnectionStore.getState().setAuthMode("none")

    expect(useConnectionStore.getState()).toMatchObject({
      authMode: "none",
      lastValidatedAt: null,
      lastServerInfo: null,
    })

    useConnectionStore.getState().markValidated(serverInfo)
    useConnectionStore.getState().setBasicCredentials({
      username: "alice",
      password: "secret",
    })

    expect(useConnectionStore.getState()).toMatchObject({
      basicCredentials: {
        username: "alice",
        password: "secret",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
    })
  })

  it("resets validation on applyConnection and can clear validation explicitly", async () => {
    const { useConnectionStore } = await import("@/shared/store/connection-store")

    useConnectionStore.getState().markValidated(serverInfo)

    useConnectionStore.getState().applyConnection({
      baseUrl: "https://demo.example.com",
      authMode: "basic",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
    })

    expect(useConnectionStore.getState()).toMatchObject({
      baseUrl: "https://demo.example.com",
      authMode: "basic",
      basicCredentials: {
        username: "demo",
        password: "pw",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
    })

    useConnectionStore.getState().markValidated(serverInfo)
    useConnectionStore.getState().clearValidation()

    expect(useConnectionStore.getState().lastValidatedAt).toBeNull()
    expect(useConnectionStore.getState().lastServerInfo).toBeNull()
  })
})
