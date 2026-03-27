import { useQuery } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionStore } from "@/shared/store/connection-store"

function useConnectionHealthQuery() {
  const api = useAppApi()
  const lastValidatedAt = useConnectionStore((state) => state.lastValidatedAt)
  const lastServerInfo = useConnectionStore((state) => state.lastServerInfo)
  const isValidated = Boolean(lastValidatedAt && lastServerInfo)

  return useQuery({
    queryKey: ["connection-health", lastServerInfo?.apiBaseUrl ?? "unvalidated"],
    queryFn: () => api.session.ping(),
    enabled: isValidated,
    retry: false,
    refetchOnWindowFocus: true,
    refetchInterval: 15_000,
  })
}

export { useConnectionHealthQuery }
