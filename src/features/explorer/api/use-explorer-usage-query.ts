import { useQuery } from "@tanstack/react-query"
import { shouldRetryExplorerQuery } from "@/features/explorer/api/retry-policy"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useExplorerUsageQuery(queryRemote: string, enabled = true, remoteName?: string | null) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()
  const remote = remoteName ?? queryRemote

  return useQuery({
    queryKey: [...queryKeys.explorer(connectionScope, remote, ""), "usage"] as const,
    queryFn: () => api.explorer.getUsage({ remote, path: "" }),
    enabled: Boolean(remote) && enabled,
    retry: shouldRetryExplorerQuery,
  })
}

export { useExplorerUsageQuery }
