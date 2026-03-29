import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AuthMode, BasicCredentials } from "@/shared/api/contracts/auth"
import type { ServerInfo } from "@/shared/api/contracts/session"

interface ConnectionState {
  baseUrl: string
  authMode: AuthMode
  basicCredentials: BasicCredentials
  lastValidatedAt: string | null
  lastServerInfo: ServerInfo | null
  validationRevision: number
  applyConnection: (connection: {
    baseUrl: string
    authMode: AuthMode
    basicCredentials: BasicCredentials
  }) => void
  setBaseUrl: (baseUrl: string) => void
  setAuthMode: (authMode: AuthMode) => void
  setBasicCredentials: (credentials: BasicCredentials) => void
  markValidated: (serverInfo: ServerInfo) => void
  clearValidation: () => void
}

const useConnectionStore = create<ConnectionState>()(
  persist(
    (set) => ({
      baseUrl: "http://localhost:5572",
      authMode: "basic",
      basicCredentials: {
        username: "gui",
        password: "",
      },
      lastValidatedAt: null,
      lastServerInfo: null,
      validationRevision: 0,
      applyConnection: (connection) =>
        set({
          baseUrl: connection.baseUrl,
          authMode: connection.authMode,
          basicCredentials: connection.basicCredentials,
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
      setBaseUrl: (baseUrl) => set({ baseUrl, lastValidatedAt: null, lastServerInfo: null }),
      setAuthMode: (authMode) => set({ authMode, lastValidatedAt: null, lastServerInfo: null }),
      setBasicCredentials: (basicCredentials) =>
        set({ basicCredentials, lastValidatedAt: null, lastServerInfo: null }),
      markValidated: (lastServerInfo) =>
        set((state) => ({
          lastServerInfo,
          lastValidatedAt: new Date().toISOString(),
          validationRevision: state.validationRevision + 1,
        })),
      clearValidation: () =>
        set({
          lastValidatedAt: null,
          lastServerInfo: null,
        }),
    }),
    {
      name: "yard-connection",
    },
  ),
)

export { useConnectionStore }
