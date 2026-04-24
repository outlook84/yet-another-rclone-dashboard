import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthMode, BasicCredentials } from "@/shared/api/contracts/auth"
import type { ServerInfo } from "@/shared/api/contracts/session"

const FALLBACK_BASE_URL = "http://localhost:5572"
const CONNECTION_STORAGE_KEY = "yard-connection"
const SAVED_CONNECTIONS_STORAGE_KEY = "yard-saved-connections"

const getDefaultBasePath = (pathname: string) => {
  if (!pathname || pathname === "/") {
    return ""
  }

  const normalizedPathname = pathname.replace(/\/index\.html$/i, "/")
  const normalizedBasePath = normalizedPathname.replace(/\/+$/, "")

  return normalizedBasePath === "/" ? "" : normalizedBasePath
}

const getDefaultBaseUrl = () => {
  if (typeof window === "undefined") {
    return FALLBACK_BASE_URL
  }

  const { origin, pathname, protocol } = window.location
  if (protocol === "http:" || protocol === "https:") {
    return `${origin}${getDefaultBasePath(pathname)}`
  }

  return FALLBACK_BASE_URL
}

type PersistedSavedConnectionProfile = {
  id: string
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
  syncEnabled?: boolean
  uploadEnabled?: boolean
}

type PersistedSavedConnectionsStorage = {
  state?: {
    profiles?: PersistedSavedConnectionProfile[]
    activeProfileId?: string | null
    selectedProfileId?: string | null
  }
}

const areConnectionSettingsEqual = (
  connection: Partial<ConnectionState> | undefined,
  profile: PersistedSavedConnectionProfile,
) => (
  connection?.baseUrl === profile.baseUrl &&
  connection?.authMode === profile.authMode &&
  connection?.basicCredentials?.username === profile.basicCredentials.username &&
  connection?.basicCredentials?.password === profile.basicCredentials.password
)

const getActiveSavedProfileCapabilities = (connection: Partial<ConnectionState> | undefined) => {
  if (typeof window === "undefined") {
    return null
  }

  const savedConnections = window.localStorage.getItem(SAVED_CONNECTIONS_STORAGE_KEY)
  if (!savedConnections) {
    return null
  }

  try {
    const storage = JSON.parse(savedConnections) as PersistedSavedConnectionsStorage
    const state = storage.state
    const activeProfileId = state?.activeProfileId ?? state?.selectedProfileId
    const profile = state?.profiles?.find((item) => item.id === activeProfileId)

    if (!profile || !areConnectionSettingsEqual(connection, profile)) {
      return null
    }

    return {
      syncEnabled: profile.syncEnabled ?? false,
      uploadEnabled: profile.uploadEnabled ?? false,
    }
  } catch {
    return null
  }
}

interface ConnectionState {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
  syncEnabled: boolean
  uploadEnabled: boolean
  lastValidatedAt: string | null
  lastServerInfo: ServerInfo | null
  validationRevision: number
  applyConnection: (connection: {
    baseUrl: string
    authMode: AuthMode
    basicCredentials: BasicCredentials
    syncEnabled?: boolean
    uploadEnabled?: boolean
  }) => void
  setBaseUrl: (baseUrl: string) => void
  setAuthMode: (authMode: AuthMode) => void
  setBasicCredentials: (credentials: BasicCredentials) => void
  markValidated: (serverInfo: ServerInfo) => void
  setServerInfo: (serverInfo: ServerInfo) => void
  clearValidation: () => void
}

const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      baseUrl: getDefaultBaseUrl(),
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
      applyConnection: (connection) =>
        set({
          baseUrl: connection.baseUrl,
          authMode: connection.authMode,
          basicCredentials: connection.basicCredentials,
          syncEnabled: connection.syncEnabled ?? false,
          uploadEnabled: connection.uploadEnabled ?? false,
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
      setBaseUrl: (baseUrl) =>
        set({
          baseUrl,
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
      setAuthMode: (authMode) =>
        set({
          authMode,
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
      setBasicCredentials: (basicCredentials) =>
        set({
          basicCredentials,
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
      markValidated: (lastServerInfo) =>
        set((state) => ({
          lastServerInfo,
          lastValidatedAt: new Date().toISOString(),
          validationRevision: state.validationRevision + 1,
        })),
      setServerInfo: (lastServerInfo) =>
        set((state) => ({
          lastServerInfo,
          lastValidatedAt: state.lastValidatedAt,
          validationRevision: state.validationRevision,
        })),
      clearValidation: () =>
        set({
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
    }),
    {
      name: CONNECTION_STORAGE_KEY,
      partialize: (state) => ({
        baseUrl: state.baseUrl,
        authMode: state.authMode,
        basicCredentials: state.basicCredentials,
        syncEnabled: state.syncEnabled,
        uploadEnabled: state.uploadEnabled,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ConnectionState> | undefined
        const activeSavedProfileCapabilities = getActiveSavedProfileCapabilities(persisted)

        return {
          ...currentState,
          baseUrl: persisted?.baseUrl ?? currentState.baseUrl,
          authMode: persisted?.authMode ?? currentState.authMode,
          basicCredentials: persisted?.basicCredentials ?? currentState.basicCredentials,
          syncEnabled: persisted?.syncEnabled ?? activeSavedProfileCapabilities?.syncEnabled ?? currentState.syncEnabled,
          uploadEnabled: persisted?.uploadEnabled ?? activeSavedProfileCapabilities?.uploadEnabled ?? currentState.uploadEnabled,
        }
      },
    },
  ),
)

export { useConnectionStore }
export { getDefaultBaseUrl }
