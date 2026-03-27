const scopeKey = (connectionScope: string) => ["scope", connectionScope] as const

export const queryKeys = {
  capabilities: ["capabilities"] as const,
  scope: scopeKey,
  serverInfo: (connectionScope: string) => [...scopeKey(connectionScope), "session", "server-info"] as const,
  remotes: (connectionScope: string) => [...scopeKey(connectionScope), "remotes"] as const,
  remote: (connectionScope: string, name: string) => [...scopeKey(connectionScope), "remotes", name] as const,
  explorer: (connectionScope: string, remote: string, path: string) =>
    [...scopeKey(connectionScope), "explorer", remote, path] as const,
  jobs: (connectionScope: string) => [...scopeKey(connectionScope), "jobs"] as const,
  job: (connectionScope: string, jobId: string | number) => [...scopeKey(connectionScope), "jobs", jobId] as const,
  stats: (connectionScope: string, group?: string) =>
    [...scopeKey(connectionScope), "stats", group ?? "global"] as const,
  transferred: (connectionScope: string, group?: string) =>
    [...scopeKey(connectionScope), "transferred", group ?? "global"] as const,
  combinedStats: (connectionScope: string, group?: string) =>
    [...scopeKey(connectionScope), "combined-stats", group ?? "global"] as const,
  mounts: (connectionScope: string) => [...scopeKey(connectionScope), "mounts"] as const,
  settings: (connectionScope: string) => [...scopeKey(connectionScope), "runtime-settings"] as const,
} as const
