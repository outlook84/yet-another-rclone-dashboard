import { useQuery } from "@tanstack/react-query"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"
import { shouldRetryExplorerQuery } from "@/features/explorer/api/retry-policy"

function useExplorerListQuery(remote: string, path: string) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()

  return useQuery({
    queryKey: queryKeys.explorer(connectionScope, remote, path),
    queryFn: () => api.explorer.list({ remote, path }),
    enabled: Boolean(remote),
    retry: shouldRetryExplorerQuery,
    refetchOnWindowFocus: false,
  })
}

export { useExplorerListQuery }
