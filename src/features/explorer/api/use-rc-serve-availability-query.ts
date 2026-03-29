import { useQuery } from "@tanstack/react-query"
import { buildRcServeProbeUrl } from "@/features/explorer/lib/rc-serve-url"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"
import { useConnectionStore } from "@/shared/store/connection-store"

async function probeRcServeAvailability(url: string): Promise<boolean> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 5000)

  try {
    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
    })
    if (response.ok) {
      return true
    }

    if (response.status === 404 || response.status === 405) {
      return false
    }

    throw new Error(`rc-serve probe failed with status ${response.status}`)
  } finally {
    clearTimeout(timeoutId)
  }
}

function useRcServeAvailabilityQuery() {
  const connectionScope = useConnectionScope()
  const authMode = useConnectionStore((state) => state.authMode)
  const apiBaseUrl = useConnectionStore((state) => state.lastServerInfo?.apiBaseUrl ?? state.baseUrl)

  return useQuery({
    queryKey: queryKeys.rcServe(connectionScope),
    queryFn: () => probeRcServeAvailability(buildRcServeProbeUrl(apiBaseUrl)),
    enabled: authMode === "none",
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 2,
    retryDelay: 0,
  })
}

export { useRcServeAvailabilityQuery }
