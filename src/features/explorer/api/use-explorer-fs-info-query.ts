import { useQuery } from "@tanstack/react-query"
import { shouldRetryExplorerQuery } from "@/features/explorer/api/retry-policy"
import { useAppApi } from "@/shared/api/client/api-context"
import { useConnectionScope } from "@/shared/hooks/use-connection-scope"
import { queryKeys } from "@/shared/lib/query-keys"

function useExplorerFsInfoQuery(queryRemote: string, remoteName?: string | null) {
  const api = useAppApi()
  const connectionScope = useConnectionScope()
  const remote = remoteName ?? queryRemote

  return useQuery({
    queryKey: [...queryKeys.explorer(connectionScope, remote, ""), "fsinfo"] as const,
    queryFn: () => api.explorer.getFsInfo({ remote, path: "" }),
    enabled: Boolean(remote),
    staleTime: 60 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
    retry: shouldRetryExplorerQuery,
  })
}

export { useExplorerFsInfoQuery }
