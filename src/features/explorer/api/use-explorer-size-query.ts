import { useQuery } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useExplorerSizeQuery(remote: string, path: string, enabled = true) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()

  return useQuery({
    queryKey: [...queryKeys.explorer(connectionScope, remote, path), "size"] as const,
    queryFn: () => api.explorer.size({ remote, path }),
    enabled: Boolean(remote) && enabled,
    staleTime: 15 * 1000,
  })
}

export { useExplorerSizeQuery }
