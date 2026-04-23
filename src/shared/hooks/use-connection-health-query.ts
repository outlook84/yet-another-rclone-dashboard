import { useQuery } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionStore } from "@/shared/store/connection-store"

function isBatchFailureResult(result: unknown) {
  if (!result || typeof result !== "object") {
    return true
  }

  const record = result as Record<string, unknown>
  return typeof record.error === "string" || (typeof record.status === "number" && record.status >= 400)
}

function toBatchError(result: unknown, path: string) {
  if (!result || typeof result !== "object") {
    return new Error(`Request failed for ${path}`)
  }

  const record = result as Record<string, unknown>
  const message =
    typeof record.error === "string"
      ? record.error
      : typeof record.message === "string"
        ? record.message
        : `Request failed for ${path}`

  return new Error(message)
}

function useConnectionHealthQuery() {
  const api = useAppApi()
  const lastValidatedAt = useConnectionStore((state) => state.lastValidatedAt)
  const lastServerInfo = useConnectionStore((state) => state.lastServerInfo)
  const setServerInfo = useConnectionStore((state) => state.setServerInfo)
  const isValidated = Boolean(lastValidatedAt && lastServerInfo)

  return useQuery({
    queryKey: ["connection-health", lastServerInfo?.apiBaseUrl ?? "unvalidated"],
    queryFn: async () => {
      const startedAt = performance.now()
      const results = await api.jobs.batch([
        { _path: "rc/noopauth" },
        { _path: "core/version" },
      ])
      const [pingResult, serverInfoResult] = results

      if (isBatchFailureResult(pingResult)) {
        throw toBatchError(pingResult, "rc/noopauth")
      }

      if (!isBatchFailureResult(serverInfoResult) && lastServerInfo) {
        const serverInfoRecord = serverInfoResult as Record<string, unknown>
        const version = typeof serverInfoRecord.version === "string" ? serverInfoRecord.version : undefined

        setServerInfo({
          ...lastServerInfo,
          version,
        })
      }

      return { ok: true, latencyMs: performance.now() - startedAt }
    },
    enabled: isValidated,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  })
}

export { useConnectionHealthQuery }
