// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest"

describe("useSavedConnectionsStore", () => {
  beforeEach(() => {
    vi.resetModules()
    window.localStorage.clear()
  })

  it("creates a readable fallback profile name and selects the new profile", async () => {
    const { useSavedConnectionsStore } = await import("@/features/auth/store/saved-connections-store")

    const profileId = useSavedConnectionsStore.getState().saveProfile({
      baseUrl: "https://demo.example.com/rc",
      name: "   ",
      authMode: "basic",
      basicCredentials: {
        username: "alice",
        password: "secret",
      },
      syncEnabled: true,
    })

    const state = useSavedConnectionsStore.getState()
    expect(state.selectedProfileId).toBe(profileId)
    expect(state.profiles[0]).toMatchObject({
      id: profileId,
      name: "demo.example.com/rc (alice)",
      baseUrl: "https://demo.example.com/rc",
      syncEnabled: true,
    })
    expect(state.profiles[0]?.updatedAt).toEqual(expect.any(String))
  })

  it("updates an existing profile in place and clears selection after deletion", async () => {
    const { useSavedConnectionsStore } = await import("@/features/auth/store/saved-connections-store")

    const profileId = useSavedConnectionsStore.getState().saveProfile({
      id: "profile-1",
      baseUrl: "http://localhost:5572",
      name: "Local",
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      syncEnabled: false,
    })

    useSavedConnectionsStore.getState().saveProfile({
      id: profileId,
      baseUrl: "http://localhost:5573",
      name: "Updated Local",
      authMode: "none",
      basicCredentials: {
        username: "",
        password: "",
      },
      syncEnabled: true,
    })

    expect(useSavedConnectionsStore.getState().profiles).toHaveLength(1)
    expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
      id: "profile-1",
      name: "Updated Local",
      baseUrl: "http://localhost:5573",
      syncEnabled: true,
    })

    useSavedConnectionsStore.getState().deleteProfile(profileId)

    expect(useSavedConnectionsStore.getState().profiles).toEqual([])
    expect(useSavedConnectionsStore.getState().selectedProfileId).toBeNull()
  })
})
