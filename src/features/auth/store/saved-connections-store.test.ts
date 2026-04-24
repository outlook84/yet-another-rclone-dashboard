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
      uploadEnabled: false,
    })

    const state = useSavedConnectionsStore.getState()
    expect(state.activeProfileId).toBe(profileId)
    expect(state.profiles[0]).toMatchObject({
      id: profileId,
      name: "demo.example.com/rc (alice)",
      baseUrl: "https://demo.example.com/rc",
      syncEnabled: true,
      uploadEnabled: false,
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
      uploadEnabled: false,
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
      uploadEnabled: true,
    })

    expect(useSavedConnectionsStore.getState().profiles).toHaveLength(1)
    expect(useSavedConnectionsStore.getState().profiles[0]).toMatchObject({
      id: "profile-1",
      name: "Updated Local",
      baseUrl: "http://localhost:5573",
      syncEnabled: true,
      uploadEnabled: true,
    })

    useSavedConnectionsStore.getState().deleteProfile(profileId)

    expect(useSavedConnectionsStore.getState().profiles).toEqual([])
    expect(useSavedConnectionsStore.getState().activeProfileId).toBeNull()
  })

  it("preserves action methods when hydrating saved profiles", async () => {
    window.localStorage.setItem(
      "yard-saved-connections",
      JSON.stringify({
        state: {
          selectedProfileId: "profile-1",
          profiles: [
            {
              id: "profile-1",
              name: "Local",
              baseUrl: "http://localhost:5572",
              authMode: "none",
              basicCredentials: {
                username: "",
                password: "",
              },
              syncEnabled: false,
              uploadEnabled: true,
              updatedAt: "2026-03-29T00:00:00.000Z",
            },
          ],
        },
        version: 0,
      }),
    )

    const { useSavedConnectionsStore } = await import("@/features/auth/store/saved-connections-store")

    expect(typeof useSavedConnectionsStore.getState().saveProfile).toBe("function")
    expect(typeof useSavedConnectionsStore.getState().setActiveProfile).toBe("function")
    expect(typeof useSavedConnectionsStore.getState().deleteProfile).toBe("function")
    expect(useSavedConnectionsStore.getState()).toMatchObject({
      activeProfileId: "profile-1",
      profiles: [
        {
          id: "profile-1",
          uploadEnabled: true,
        },
      ],
    })

    useSavedConnectionsStore.getState().setActiveProfile(null)
    useSavedConnectionsStore.getState().deleteProfile("profile-1")

    expect(useSavedConnectionsStore.getState().activeProfileId).toBeNull()
    expect(useSavedConnectionsStore.getState().profiles).toEqual([])
  })
})
