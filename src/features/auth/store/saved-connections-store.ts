import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthMode, BasicCredentials } from "@/shared/api/contracts/auth"

interface SavedConnectionProfile {
  id: string
  name: string
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
  syncEnabled: boolean
  updatedAt: string
}

interface SavedConnectionsState {
  profiles: SavedConnectionProfile[]
  selectedProfileId: string | null
  saveProfile: (profile: Omit<SavedConnectionProfile, "id" | "updatedAt"> & { id?: string }) => string
  selectProfile: (profileId: string | null) => void
  deleteProfile: (profileId: string) => void
}

const createProfileName = (baseUrl: string, authMode: AuthMode, username: string) => {
  try {
    const url = new URL(baseUrl)
    const path = url.pathname === "/" ? "" : url.pathname
    const authSuffix = authMode === "basic" && username ? ` (${username})` : ""
    return `${url.host}${path}${authSuffix}`
  } catch {
    return baseUrl || "Saved Connection"
  }
}

const useSavedConnectionsStore = create<SavedConnectionsState>()(
  persist(
    (set) => ({
      profiles: [],
      selectedProfileId: null,
      saveProfile: (profile) => {
        const profileId = profile.id ?? globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
        const nextProfile: SavedConnectionProfile = {
          id: profileId,
          name: profile.name.trim() || createProfileName(profile.baseUrl, profile.authMode, profile.basicCredentials.username),
          baseUrl: profile.baseUrl,
          authMode: profile.authMode,
          basicCredentials: profile.basicCredentials,
          syncEnabled: profile.syncEnabled,
          updatedAt: new Date().toISOString(),
        }

        set((state) => {
          const existingIndex = state.profiles.findIndex((item) => item.id === profileId)
          const profiles =
            existingIndex >= 0
              ? state.profiles.map((item) => (item.id === profileId ? nextProfile : item))
              : [nextProfile, ...state.profiles]

          return {
            profiles,
            selectedProfileId: profileId,
          }
        })

        return profileId
      },
      selectProfile: (selectedProfileId) => set({ selectedProfileId }),
      deleteProfile: (profileId) =>
        set((state) => ({
          profiles: state.profiles.filter((item) => item.id !== profileId),
          selectedProfileId: state.selectedProfileId === profileId ? null : state.selectedProfileId,
        })),
    }),
    {
      name: "yard-saved-connections",
    },
  ),
)

export { useSavedConnectionsStore }
export type { SavedConnectionProfile }
