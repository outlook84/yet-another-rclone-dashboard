import { useQuery } from "@tanstack/react-query"
import { buildRcServeProbeUrl } from "@/features/explorer/lib/rc-serve-url"
import { useSavedConnectionsStore } from "@/features/auth/store/saved-connections-store"
import { buildConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

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
  const profiles = useSavedConnectionsStore((state) => state.profiles)
  const activeProfileId = useSavedConnectionsStore((state) => state.activeProfileId)
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId) ?? null
  const profileScope = activeProfile === null
    ? ""
    : buildConnectionScope({
        baseUrl: activeProfile.baseUrl,
        authMode: activeProfile.authMode,
        username: activeProfile.basicCredentials.username,
      })

  return useQuery({
    queryKey: queryKeys.rcServe(profileScope),
    queryFn: () => probeRcServeAvailability(buildRcServeProbeUrl(activeProfile?.baseUrl ?? "")),
    enabled: activeProfile?.authMode === "none" && Boolean(activeProfile.baseUrl),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 2,
    retryDelay: 0,
  })
}

export { useRcServeAvailabilityQuery }
