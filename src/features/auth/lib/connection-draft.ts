import type { AuthMode, BasicCredentials } from "@/shared/api/contracts/auth"
import type { SavedConnectionProfile } from "@/features/auth/store/saved-connections-store"

type ConnectionDraft = {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
  syncEnabled: boolean
  uploadEnabled: boolean
}

function areDraftSettingsEqual(
  draft: ConnectionDraft,
  profile: {
    baseUrl: string
    authMode: AuthMode
    basicCredentials: BasicCredentials
    syncEnabled: boolean
    uploadEnabled: boolean
  } | null,
) {
  if (!profile) {
    return false
  }

  return (
    draft.baseUrl === profile.baseUrl
    && draft.authMode === profile.authMode
    && draft.basicCredentials.username === profile.basicCredentials.username
    && draft.basicCredentials.password === profile.basicCredentials.password
    && draft.syncEnabled === profile.syncEnabled
    && draft.uploadEnabled === profile.uploadEnabled
  )
}

function toDraftFromProfile(profile: SavedConnectionProfile): ConnectionDraft {
  return {
    baseUrl: profile.baseUrl,
    authMode: profile.authMode,
    basicCredentials: profile.basicCredentials,
    syncEnabled: profile.syncEnabled,
    uploadEnabled: profile.uploadEnabled,
  }
}

function toDraftFromConnection(input: {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
  syncEnabled: boolean
  uploadEnabled: boolean
}): ConnectionDraft {
  return {
    baseUrl: input.baseUrl,
    authMode: input.authMode,
    basicCredentials: input.basicCredentials,
    syncEnabled: input.syncEnabled,
    uploadEnabled: input.uploadEnabled,
  }
}

export { areDraftSettingsEqual, toDraftFromConnection, toDraftFromProfile }
export type { ConnectionDraft }
